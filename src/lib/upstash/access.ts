/**
 * The one way the web app talks to Upstash Redis.
 *
 * The estate runs on the Upstash free tier (500,000 requests a month). On
 * 2026-11-21 the production database had used 495,546 of them, and on
 * 2026-11-15 an exhausted quota ("ERR max requests limit exceeded") took the
 * site down for 25 h. The operator's decision (board card t_58ea319d, option
 * A): stay on the free tier, spend as few commands as possible, and keep the
 * site working without Upstash until the monthly reset.
 *
 * This module owns three things:
 *
 * 1. **One client.** `getUpstashRedis()` builds a single `Redis` client from
 *    `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, with a short
 *    per-request timeout and one network retry (the SDK default is five, and
 *    every retry is a billed request).
 * 2. **One circuit breaker.** `UpstashBreaker` opens immediately on a quota
 *    error, an auth error or a timeout (and after five consecutive other
 *    errors), skips Upstash for a 10-minute cool-down, then lets exactly one
 *    half-open probe through. A successful probe closes it, which is how the
 *    breaker closes on its own after the monthly reset. It logs only when it
 *    opens and when it closes.
 * 3. **One call wrapper.** `withUpstash(op, fallback)` runs a command only
 *    while the breaker allows it, records the outcome, and returns the
 *    caller's fallback (go to the source, count locally) otherwise.
 *
 * The client and the breaker are kept on `globalThis`, so the proxy bundle
 * and the route/action bundles in the same Node process share one breaker:
 * once the proxy learns the quota is gone, the caches stop asking too.
 *
 * Every key the app writes is namespaced (`namespacedKey`) and every write
 * carries a TTL; see the cache modules.
 */

import { Redis } from "@upstash/redis";

/** Per-request timeout for the Upstash REST client. */
export const UPSTASH_REQUEST_TIMEOUT_MS = 1500;

/** How long the breaker skips Upstash after it opens. */
export const BREAKER_COOL_DOWN_MS = 10 * 60_000;

/** Consecutive unclassified errors that open the breaker. */
export const BREAKER_FAILURE_THRESHOLD = 5;

/** Prefix of every key the web app writes. */
export const KEY_NAMESPACE = "fs:web";

export type BreakerState = "closed" | "open" | "half-open";

/** Why a call failed, as far as the breaker cares. */
export type UpstashFailureKind = "quota" | "auth" | "timeout" | "other";

/**
 * Classify an Upstash error without logging or keeping its message (the SDK
 * puts the whole command, keys included, into the message).
 */
export function classifyUpstashError(error: unknown): UpstashFailureKind {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/max (daily |monthly )?requests? limit exceeded|max requests limit/i.test(message)) return "quota";
  if (/\b(unauthori[sz]ed|wrongpass|noauth|invalid (api )?token|forbidden|401|403)\b/i.test(message)) return "auth";
  if (name === "TimeoutError" || name === "AbortError" || /timed? ?out|timeout|aborted/i.test(message)) {
    return "timeout";
  }
  return "other";
}

export interface UpstashBreakerOptions {
  coolDownMs?: number;
  threshold?: number;
  now?: () => number;
  /** Transition logger. Called only when the breaker opens or closes. */
  log?: (event: "open" | "close", detail: { reason?: UpstashFailureKind }) => void;
}

function defaultLog(event: "open" | "close", detail: { reason?: UpstashFailureKind }): void {
  if (event === "open") {
    console.warn(
      `[upstash] breaker open (${detail.reason ?? "other"}): skipping Upstash and using local fallbacks; ` +
        `retrying in ${Math.round(BREAKER_COOL_DOWN_MS / 60_000)} min`,
    );
  } else {
    console.info("[upstash] breaker closed: Upstash answered again");
  }
}

/**
 * Circuit breaker for the Upstash dependency.
 *
 * - **closed**: calls go through. A quota, auth or timeout error opens it at
 *   once; other errors open it after `threshold` in a row.
 * - **open**: calls are skipped for `coolDownMs`.
 * - **half-open**: after the cool-down, `tryAcquire()` grants one probe. Other
 *   callers keep using the fallback until the probe reports. Success closes
 *   the breaker; any failure re-opens it for another cool-down (without a log
 *   line, so a month-long quota outage logs once).
 */
export class UpstashBreaker {
  private current: BreakerState = "closed";
  private openedAt = 0;
  private consecutiveFailures = 0;
  private probeStartedAt: number | null = null;
  private reason: UpstashFailureKind | null = null;
  private readonly coolDownMs: number;
  private readonly threshold: number;
  private readonly now: () => number;
  private readonly log: NonNullable<UpstashBreakerOptions["log"]>;

  constructor(options: UpstashBreakerOptions = {}) {
    this.coolDownMs = options.coolDownMs ?? BREAKER_COOL_DOWN_MS;
    this.threshold = options.threshold ?? BREAKER_FAILURE_THRESHOLD;
    this.now = options.now ?? (() => Date.now());
    this.log = options.log ?? defaultLog;
  }

  /** Current state. An open breaker whose cool-down has elapsed reads as half-open. */
  get state(): BreakerState {
    if (this.current === "open" && this.now() - this.openedAt >= this.coolDownMs) {
      this.current = "half-open";
      this.probeStartedAt = null;
    }
    return this.current;
  }

  /** Why the breaker last opened, or null while it has never opened. */
  get lastReason(): UpstashFailureKind | null {
    return this.reason;
  }

  /**
   * May the caller send a command now? In half-open this claims the single
   * probe slot, so call it once per command, right before sending it. A probe
   * that never reports frees its slot after one cool-down.
   */
  tryAcquire(): boolean {
    const state = this.state;
    if (state === "closed") return true;
    if (state === "open") return false;
    const now = this.now();
    if (this.probeStartedAt !== null && now - this.probeStartedAt < this.coolDownMs) return false;
    this.probeStartedAt = now;
    return true;
  }

  /** Same as `!tryAcquire()`; the shape `SharedRateLimiter` expects. */
  isOpen(): boolean {
    return !this.tryAcquire();
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.probeStartedAt = null;
    if (this.current !== "closed") {
      this.current = "closed";
      this.log("close", {});
    }
  }

  recordFailure(error?: unknown): void {
    const kind = classifyUpstashError(error);
    this.consecutiveFailures++;
    const state = this.state;
    if (state === "half-open") {
      // The probe failed: back to open for another cool-down, silently.
      this.openFor(kind, false);
      return;
    }
    if (state === "open") return;
    if (kind !== "other" || this.consecutiveFailures >= this.threshold) {
      this.openFor(kind, true);
    }
  }

  private openFor(kind: UpstashFailureKind, announce: boolean): void {
    this.current = "open";
    this.openedAt = this.now();
    this.probeStartedAt = null;
    this.reason = kind;
    if (announce) this.log("open", { reason: kind });
  }
}

// ============================================================================
// Shared client and breaker
// ============================================================================

/** The subset of the Redis client the cache helpers use. */
export type UpstashClient = Redis;

export interface UpstashAccess {
  client: UpstashClient | null;
  breaker: UpstashBreaker;
}

interface SharedState {
  access: UpstashAccess;
  /** url+token the client was built from, so a changed env rebuilds it. */
  configKey: string;
  override: boolean;
}

const GLOBAL_KEY = Symbol.for("foodshare.web.upstash-access");

function sharedState(): SharedState {
  const holder = globalThis as unknown as Record<symbol, SharedState | undefined>;
  let state = holder[GLOBAL_KEY];
  if (!state) {
    state = { access: { client: null, breaker: new UpstashBreaker() }, configKey: "", override: false };
    holder[GLOBAL_KEY] = state;
  }
  return state;
}

function readConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * The shared client and breaker. The client is null when Upstash is not
 * configured; callers then use their local fallback.
 *
 * Vault exception (card t_736c23f9): the credentials come from process.env,
 * as the proxy and sharedRateLimit always read them; the deploy injects them.
 */
export function getUpstashAccess(): UpstashAccess {
  const state = sharedState();
  if (state.override) return state.access;
  const config = readConfig();
  const key = config ? `${config.url}\u0000${config.token}` : "";
  if (key !== state.configKey) {
    state.configKey = key;
    state.access.client = config
      ? new Redis({
          url: config.url,
          token: config.token,
          // A fresh signal per request: the SDK calls the function each time.
          signal: () => AbortSignal.timeout(UPSTASH_REQUEST_TIMEOUT_MS),
          // One retry on network errors only; every retry is a billed request.
          retry: { retries: 1, backoff: () => 50 },
          enableTelemetry: false,
        })
      : null;
  }
  return state.access;
}

export function getUpstashRedis(): UpstashClient | null {
  return getUpstashAccess().client;
}

export function getUpstashBreaker(): UpstashBreaker {
  return getUpstashAccess().breaker;
}

export function isUpstashConfigured(): boolean {
  return getUpstashRedis() !== null;
}

/**
 * Replace the shared client and breaker (tests only). Pass null to go back to
 * the environment-built client with a fresh breaker.
 */
export function setUpstashAccessForTesting(access: { client: unknown; breaker?: UpstashBreaker } | null): void {
  const state = sharedState();
  if (access === null) {
    state.override = false;
    state.configKey = "";
    state.access = { client: null, breaker: new UpstashBreaker() };
    return;
  }
  state.override = true;
  state.access = { client: access.client as UpstashClient | null, breaker: access.breaker ?? new UpstashBreaker() };
}

/**
 * Run one Upstash operation if the breaker allows it, or return the fallback.
 *
 * The fallback is what the caller does without Upstash: read the source,
 * count locally, skip the write. Errors never escape.
 */
export async function withUpstash<T>(
  op: (client: UpstashClient) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const { client, breaker } = getUpstashAccess();
  if (!client || !breaker.tryAcquire()) return fallback();
  try {
    const result = await op(client);
    breaker.recordSuccess();
    return result;
  } catch (error) {
    breaker.recordFailure(error);
    return fallback();
  }
}

/** Prefix a key with the web namespace (idempotent). */
export function namespacedKey(key: string): string {
  const prefix = `${KEY_NAMESPACE}:`;
  return key.startsWith(prefix) ? key : `${prefix}${key}`;
}
