/**
 * Upstash circuit breaker (task 23.2).
 *
 * The free Upstash Redis database allows 500,000 requests a month. When the
 * quota is spent every command fails with `ERR max requests limit exceeded`
 * until the monthly reset, and a client that keeps retrying only burns edge
 * time and (for retried commands) more quota. This breaker lets every
 * Upstash caller stop asking, serve from the source of truth instead, and
 * recover on its own.
 *
 * Behaviour:
 * - A quota, auth, timeout or unavailable failure opens the breaker at once.
 * - While open, `allow()` is false for the cool-down (10 minutes), so callers
 *   skip Upstash without a network call.
 * - After the cool-down exactly one caller is let through (half-open). If that
 *   call succeeds the breaker closes; if it fails the breaker opens again for
 *   another cool-down. Other callers keep skipping while the probe is in
 *   flight.
 * - Only the open and close transitions are logged.
 *
 * State is per isolate and in memory, so a cold start begins closed and the
 * first failing call re-opens it. That is deliberate: no shared state means
 * no extra Upstash commands to coordinate the breaker.
 *
 * One breaker per Upstash database (Redis and Vector have separate quotas),
 * obtained with `getUpstashBreaker(name)`.
 */
import { logger } from "./logger.ts";

export const UPSTASH_COOLDOWN_MS = 10 * 60 * 1000;
/** Per-request timeout for every Upstash call (ms). */
export const UPSTASH_TIMEOUT_MS = 3000;
/** A half-open probe that never reports back frees its slot after this long. */
const PROBE_LEASE_MS = 30_000;

export type UpstashFailureKind = "quota" | "auth" | "timeout" | "unavailable";
export type UpstashBreakerState = "closed" | "open" | "half-open";

export interface UpstashBreakerSnapshot {
  name: string;
  state: UpstashBreakerState;
  /** Why the breaker last opened; null while it has never opened. */
  lastFailureKind: UpstashFailureKind | null;
  /** Epoch ms at which a half-open try is next allowed; 0 when closed. */
  retryAtMs: number;
}

export interface UpstashBreakerOptions {
  cooldownMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

const QUOTA_PATTERN =
  /max (daily |monthly )?requests? limit exceeded|request limit exceeded|quota (exceeded|exhausted)|limit exceeded/i;
const AUTH_PATTERN = /wrongpass|noauth|unauthori[sz]ed|invalid (token|password)|forbidden/i;

/**
 * Classify a failed Upstash response or thrown error. Returns null for errors
 * that say nothing about Upstash's availability (a bad command, a wrong type),
 * which must not open the breaker.
 */
export function classifyUpstashFailure(
  input: { status?: number; message?: string; error?: unknown },
): UpstashFailureKind | null {
  const message = input.message ??
    (input.error instanceof Error ? input.error.message : "");
  if (QUOTA_PATTERN.test(message)) return "quota";
  const status = input.status;
  if (status === 429) return "quota";
  if (status === 401 || status === 403 || AUTH_PATTERN.test(message)) return "auth";
  if (status === 408 || status === 504) return "timeout";
  if (status !== undefined && status >= 500) return "unavailable";
  if (input.error !== undefined) {
    const name = input.error instanceof Error ? input.error.name : "";
    if (name === "AbortError" || name === "TimeoutError") return "timeout";
    // fetch rejects with a TypeError on DNS, connection and TLS failures.
    if (input.error instanceof TypeError) return "unavailable";
  }
  return null;
}

export class UpstashBreaker {
  private state: UpstashBreakerState = "closed";
  private openedAt = 0;
  private probeStartedAt = 0;
  private lastKind: UpstashFailureKind | null = null;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(readonly name: string, options: UpstashBreakerOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? UPSTASH_COOLDOWN_MS;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * May the caller use Upstash right now? When this returns true while the
   * breaker was open, the caller is the single half-open probe and must
   * report the outcome with `recordSuccess()` or `recordFailure()`.
   */
  allow(): boolean {
    if (this.state === "closed") return true;
    const now = this.now();
    if (this.state === "open") {
      if (now - this.openedAt < this.cooldownMs) return false;
      this.state = "half-open";
      this.probeStartedAt = now;
      return true;
    }
    // half-open: one probe at a time, with a lease so a lost probe cannot
    // wedge the breaker.
    if (now - this.probeStartedAt < PROBE_LEASE_MS) return false;
    this.probeStartedAt = now;
    return true;
  }

  recordSuccess(): void {
    if (this.state === "closed") return;
    this.state = "closed";
    this.openedAt = 0;
    this.probeStartedAt = 0;
    logger.info("Upstash circuit closed", { breaker: this.name });
  }

  recordFailure(kind: UpstashFailureKind): void {
    const wasOpen = this.state === "open";
    this.state = "open";
    this.openedAt = this.now();
    this.probeStartedAt = 0;
    this.lastKind = kind;
    if (!wasOpen) {
      logger.warn("Upstash circuit opened", {
        breaker: this.name,
        kind,
        cooldownMs: this.cooldownMs,
      });
    }
  }

  /** Read-only view for health reporting. Never changes state. */
  snapshot(): UpstashBreakerSnapshot {
    const open = this.state !== "closed";
    return {
      name: this.name,
      state: this.state,
      lastFailureKind: this.lastKind,
      retryAtMs: open ? this.openedAt + this.cooldownMs : 0,
    };
  }

  /**
   * Would `allow()` refuse right now? A read-only pre-check for gates that
   * run before the real call (it never takes the half-open probe slot).
   */
  wouldSkip(): boolean {
    if (this.state === "closed") return false;
    const now = this.now();
    if (this.state === "open") return now - this.openedAt < this.cooldownMs;
    return now - this.probeStartedAt < PROBE_LEASE_MS;
  }

  /** True while the breaker is not closed. Does not consume the probe slot. */
  isDegraded(): boolean {
    return this.state !== "closed";
  }

  /** Whole seconds until the next half-open try, at least 1 while open. */
  retryAfterSeconds(): number {
    if (this.state === "closed") return 0;
    return Math.max(1, Math.ceil((this.openedAt + this.cooldownMs - this.now()) / 1000));
  }

  reset(): void {
    this.state = "closed";
    this.openedAt = 0;
    this.probeStartedAt = 0;
    this.lastKind = null;
  }
}

const breakers = new Map<string, UpstashBreaker>();

/** One breaker per Upstash database, shared by every caller in the isolate. */
export function getUpstashBreaker(name: string): UpstashBreaker {
  let breaker = breakers.get(name);
  if (!breaker) {
    breaker = new UpstashBreaker(name);
    breakers.set(name, breaker);
  }
  return breaker;
}

/** Test helper: close and forget every breaker. */
export function resetUpstashBreakers(): void {
  breakers.clear();
}
