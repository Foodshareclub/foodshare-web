/**
 * Shared (multi-instance) rate limiting for server actions.
 *
 * `src/app/actions/post-activity.ts` and `src/app/actions/ai-draft.ts` used to
 * keep their counters in an in-memory `Map`. Each web instance therefore had
 * its own Map: with N instances behind the load balancer the effective limit
 * was N × the configured value, and a client rotating across instances
 * degraded the control toward bypass. The control worked as designed at
 * single-instance scale, which is why the gap stayed in the backlog until the
 * estate ran a second web instance.
 *
 * The counter now lives in the estate's Upstash Redis — the same store the
 * proxy limiters in `src/proxy.ts` use — so every instance reads and writes
 * the same key. The limit values are unchanged (100 requests per minute per
 * client IP for post activity; 10 drafts per hour per user for AI drafts),
 * and the window algorithm is the same fixed window the in-memory version
 * implemented: the first request in a window anchors it, and the budget
 * resets when the window expires.
 *
 * ## Upstash quota cost
 *
 * Each check costs exactly one Upstash REST call (a single EVAL). Both
 * endpoints are low-frequency writes — activity log entries and LLM draft
 * requests — and both sit behind the proxy's global and mutation limiters,
 * which already hit Upstash on every proxied request. The added volume is
 * negligible against the caching traffic that drives the free-plan quota
 * pressure, and a whole lot less than the per-request cost of the proxy
 * limiters it complements.
 *
 * ## When Redis is missing — and when it answers with errors
 *
 * Two different failures, two different directions (the policy the proxy
 * settled in 450d733a, which this module follows):
 *
 * - **Never wired up** (production without `UPSTASH_REDIS_REST_URL` /
 *   `UPSTASH_REDIS_REST_TOKEN`): fail **closed**. A misconfiguration is
 *   answered with SERVICE_UNAVAILABLE — and a FATAL at module init —
 *   rather than silently degrading to the per-instance fallback below,
 *   which would hide the missing configuration. Same reason the proxy
 *   answers 503.
 * - **Wired up but answering with errors** (Upstash down, or the monthly
 *   quota exhausted — the 2026-11-15 incident was "ERR max requests limit
 *   exceeded. Limit: 500000", and a counter in a billing dashboard became
 *   the site's availability state for 25 h): fall back to **per-instance
 *   memory limiting**. A rate limit is a control, not the app, so
 *   availability is preserved: within-budget requests are still served
 *   (no 500), and over-budget ones receive the normal rate-limit response
 *   — but the limit still applies for the duration of the outage, counted
 *   against a per-instance `MemoryRateLimitStore` instead of being skipped
 *   entirely. A circuit breaker (five consecutive errors opens it for a
 *   minute, one half-open request re-tries, the first success closes it)
 *   keeps the degraded mode from paying Upstash on every request while
 *   the store refuses service — the same breaker parameters the proxy
 *   uses. (The proxy's own limiters keep their 450d733a fail-open policy;
 *   this module deliberately diverges on the runtime-error path, because
 *   it guards low-frequency endpoints where a per-instance fallback costs
 *   nothing.)
 *
 *   **Accepted residual (N× during an outage).** The fallback budget is
 *   per instance, not shared: with N web instances behind the load
 *   balancer, the effective limit during an Upstash outage is N × the
 *   configured value. That is strictly stronger than the fail-open this
 *   policy replaced (no limit at all) and identical to what the original
 *   in-memory limiters always delivered; the outage bounds it, and the
 *   shared budget resumes as soon as the store answers again.
 *
 * Development and CI (which run the production server without Redis) keep
 * a per-instance in-memory store with exactly the semantics the original
 * in-action Maps had, so local behavior is unchanged.
 *
 * ## Client bundle
 *
 * Import this module from server actions only. It must not be added to
 * `src/lib/security/index.ts`: that barrel is re-exported by `lib/utils.ts`
 * and a previous rate-limit helper reached the client bundle that way,
 * dragging `@upstash/redis` into every page.
 */

import { Redis } from "@upstash/redis";
import { isRateLimitingRequired } from "./rateLimitPolicy";

// ============================================================================
// Stores — where the counter lives
// ============================================================================

export interface RateLimitCountResult {
  /** Requests counted in the current window, including this one. */
  count: number;
  /** Milliseconds until the window expires (and the budget resets). */
  ttlMs: number;
}

/**
 * The counter backing a rate limiter.
 *
 * The production store keeps the counter in Upstash Redis, shared by every
 * web instance. The memory store is per-process by construction: it is the
 * development/CI store and — since the degraded-mode fix — each limiter's
 * per-instance fallback when the shared store does not answer, with exactly
 * the semantics the original in-action limiters had.
 */
export interface RateLimitStore {
  /**
   * Atomically increment the counter for `key`, anchoring the window
   * (TTL = `windowMs`) when this is the first increment in it.
   *
   * Returns the new count and the remaining TTL, or null when the store
   * could not answer.
   */
  increment(key: string, windowMs: number): Promise<RateLimitCountResult | null>;
}

/**
 * The whole shared state is this one key, and the script runs atomically on
 * Redis, so concurrent first requests cannot race the window anchor: INCR is
 * a single server-side operation, and only the call that observes count == 1
 * sets the TTL.
 */
export const FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("PTTL", KEYS[1]) }
`;

/**
 * The surface of `@upstash/redis` this module needs. The real Redis client
 * satisfies it; tests pass fakes so the production store code path runs
 * unmodified against a fake.
 */
export interface EvalClient {
  eval(script: string, keys: string[], args: unknown[]): Promise<[number, number]>;
}

/**
 * The production store: the counter lives in Upstash Redis, so every web
 * instance counts against the same budget.
 */
export class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly client: EvalClient) {}

  async increment(key: string, windowMs: number): Promise<RateLimitCountResult | null> {
    try {
      const [count, ttlMs] = await this.client.eval(FIXED_WINDOW_SCRIPT, [key], [String(windowMs)]);
      // A verdict that is not two numbers is not a verdict. Refuse it the
      // same way a missing one is refused: fail closed, never guess.
      if (typeof count !== "number" || typeof ttlMs !== "number") return null;
      return { count, ttlMs };
    } catch {
      return null;
    }
  }
}

/**
 * The per-process store: a Map with exactly the semantics the original
 * in-action limiters had (fixed window anchored at the first request,
 * strict `now > resetAt` expiry). Used as the development/CI store and as
 * each limiter's per-instance degraded-mode fallback in production (see
 * the module docs for the accepted N× residual during an outage).
 * Single-instance by construction — the shared production store is
 * Upstash, and a production deploy missing it fails closed.
 *
 * **Bounded retention.** The entry count is capped (default 100_000, per
 * limiter): when a *new* key arrives at the cap, entries whose window has
 * fully elapsed are swept first, and if the cap is still full the
 * oldest-inserted entry is evicted (the Map preserves insertion order). An
 * evicted identifier is simply uncounted from that point on and re-anchors
 * a fresh window when seen again — the accepted consequence of the
 * sustained unique-IP pressure that alone reaches the cap; dev/CI never
 * approach it.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    /** Bound on tracked entries; see the class docs for the eviction policy. */
    private readonly cap = 100_000,
  ) {}

  /** Current entry count (observability; the cap is enforced on insert). */
  get size(): number {
    return this.entries.size;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitCountResult | null> {
    const now = this.now();
    const existing = this.entries.get(key);
    if (!existing || now > existing.resetAt) {
      // A new key grows the Map; an expired key reusing its own slot does
      // not, so only the new-key path pays for room.
      if (!existing) this.makeRoom(now);
      this.entries.set(key, { count: 1, resetAt: now + windowMs });
      return { count: 1, ttlMs: windowMs };
    }
    existing.count += 1;
    return { count: existing.count, ttlMs: existing.resetAt - now };
  }

  /**
   * Make room for one new key when the store is at the cap: reclaim
   * entries whose window has fully elapsed first, then evict the
   * oldest-inserted entry if that is not enough. Verdict semantics are
   * untouched — the evicted identifier is simply uncounted from here on
   * and re-anchors a fresh window when it is seen again.
   */
  private makeRoom(now: number): void {
    if (this.entries.size < this.cap) return;
    for (const [key, entry] of this.entries) {
      if (now > entry.resetAt) this.entries.delete(key);
    }
    if (this.entries.size >= this.cap) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }
}

// ============================================================================
// Circuit breaker (module-local, in-memory)
// ============================================================================

/**
 * The same breaker the proxy keeps for its limiters (src/proxy.ts,
 * 450d733a): five consecutive failures open the circuit for a minute, one
 * half-open request re-tries, and the first success closes it. Ported with
 * an injectable clock so the transitions are testable; the parameters are
 * the proxy's, because this is the same dependency and the same failure —
 * Upstash refusing service while the rest of the site keeps running.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly threshold = 5,
    private readonly openMs = 60_000,
    private readonly halfOpenMs = 30_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  isOpen(): boolean {
    const now = this.now();

    if (this.state === "open") {
      if (now - this.lastFailure > this.openMs) {
        this.state = "half-open";
        return false;
      }
      return true;
    }

    if (this.state === "half-open" && now - this.lastFailure > this.halfOpenMs) {
      // The half-open window passed with the circuit still carrying the
      // failure count: treat the silence as recovery.
      this.state = "closed";
      this.failures = 0;
    }

    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = this.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
      console.warn("[sharedRateLimit] circuit opened after repeated Upstash errors");
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }
}

// ============================================================================
// Limiter
// ============================================================================

export interface RateLimitVerdict {
  /** True when the request is allowed. */
  success: boolean;
  /**
   * "ok" — allowed; "limited" — the window's budget is exhausted (the
   * shared store's, or the per-instance fallback's while it answers for
   * the shared one); "unavailable" — no store to count against (a
   * production deploy missing Upstash: fail closed); "degraded" — the
   * store is wired up but not answering, and the request was allowed
   * against the per-instance fallback budget (see the module docs).
   */
  reason: "ok" | "limited" | "unavailable" | "degraded";
  /**
   * Present when the verdict came from the degraded path — the shared
   * store did not answer and the per-instance fallback decided:
   * "circuit-open" (no Upstash call was even attempted) or "redis-error"
   * (the store was asked and could not answer). Carried on "limited"
   * verdicts as well, so an operator can see the limit came from the
   * per-instance fallback during an outage.
   */
  degraded?: "circuit-open" | "redis-error";
  /** Budget remaining in the current window (informational). */
  remaining: number;
  /** Milliseconds until the window frees budget (0 when allowed). */
  retryAfterMs: number;
}

export interface SharedRateLimiterOptions {
  /** Maximum requests allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Key namespace, so this limiter's keys cannot collide with the proxy's. */
  prefix: string;
  /**
   * Where the counter lives. In production this is the Upstash store,
   * shared by every instance; null only in a production deploy missing
   * Upstash, which is answered "unavailable" rather than unlimited.
   */
  store: RateLimitStore | null;
  /**
   * Optional breaker for the store's error path. Present in production so
   * a degraded Upstash does not cost a REST call per request; see the
   * module docs for the degraded-mode policy it implements.
   */
  breaker?: CircuitBreaker;
}

export class SharedRateLimiter {
  /**
   * Per-instance fallback for the degraded path (see the module docs):
   * when the shared store does not answer — or the breaker is open — the
   * request is counted here instead of skipping the limit. One per limiter
   * instance, so each web instance keeps its own budget while the shared
   * store is down (accepted N× residual, module docs).
   */
  private readonly fallback = new MemoryRateLimitStore();

  constructor(private readonly options: SharedRateLimiterOptions) {}

  /**
   * Count one request for `identifier` and say whether it is allowed.
   *
   * Two failure directions (see the module docs): no store configured is a
   * misconfiguration, answered "unavailable" so the caller fails closed; a
   * store that is wired up but does not answer is counted against this
   * instance's per-instance fallback — within-budget requests are still
   * served (availability), over-budget ones get the normal rate-limit
   * response — with the breaker keeping the degraded mode from paying
   * Upstash per request.
   */
  async check(identifier: string): Promise<RateLimitVerdict> {
    const { max, windowMs, prefix, store, breaker } = this.options;

    if (!store) {
      return {
        success: false,
        reason: "unavailable",
        remaining: 0,
        retryAfterMs: 0,
      };
    }

    if (breaker?.isOpen()) {
      return this.degradedCheck("circuit-open", identifier, max, windowMs, prefix);
    }

    const result = await store.increment(`${prefix}:${identifier}`, windowMs);
    if (result === null) {
      breaker?.recordFailure();
      console.warn("[sharedRateLimit] Upstash error — counting against the per-instance fallback for this pass");
      return this.degradedCheck("redis-error", identifier, max, windowMs, prefix);
    }
    breaker?.recordSuccess();

    if (result.count > max) {
      return {
        success: false,
        reason: "limited",
        remaining: 0,
        retryAfterMs: Math.max(0, result.ttlMs),
      };
    }

    return {
      success: true,
      reason: "ok",
      remaining: max - result.count,
      retryAfterMs: 0,
    };
  }

  /**
   * The degraded path: the shared store did not answer, so the request is
   * counted against this instance's per-instance fallback instead of being
   * served without the limit. Within the fallback budget the request is
   * allowed (reason "degraded" — availability is preserved); over the
   * budget it is limited exactly like a normal over-window request, and
   * the verdict keeps the degraded marker so the limit's origin is
   * visible. The fallback is per-instance: across N instances the
   * effective limit during an outage is N× the configured value — the
   * accepted residual, see the module docs.
   */
  private async degradedCheck(
    degraded: "circuit-open" | "redis-error",
    identifier: string,
    max: number,
    windowMs: number,
    prefix: string,
  ): Promise<RateLimitVerdict> {
    const result = await this.fallback.increment(`${prefix}:${identifier}`, windowMs);
    // The memory fallback never fails to answer. If a future replacement
    // did, the last honest option is still to serve — never to guess a
    // verdict — so a null from the fallback degrades to "served, uncounted".
    if (result === null) {
      return {
        success: true,
        reason: "degraded",
        degraded,
        remaining: max,
        retryAfterMs: 0,
      };
    }
    if (result.count > max) {
      return {
        success: false,
        reason: "limited",
        degraded,
        remaining: 0,
        retryAfterMs: Math.max(0, result.ttlMs),
      };
    }
    return {
      success: true,
      reason: "degraded",
      degraded,
      remaining: max - result.count,
      retryAfterMs: 0,
    };
  }
}

// ============================================================================
// The estate's action limiters
// ============================================================================

/** Post activity logging: 100 requests per minute per client IP (unchanged). */
export const POST_ACTIVITY_LIMIT = {
  max: 100,
  windowMs: 60_000,
  prefix: "ratelimit:post-activity",
} as const;

/** AI listing drafts: 10 drafts per hour per user (unchanged). */
export const AI_DRAFT_LIMIT = {
  max: 10,
  windowMs: 60 * 60_000,
  prefix: "ratelimit:ai-draft",
} as const;

const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const required = isRateLimitingRequired(process.env);

if (required && !upstashRedis && typeof console !== "undefined") {
  console.error(
    "[sharedRateLimit] FATAL: rate limiting is disabled in production because UPSTASH_REDIS_REST_URL / " +
      "UPSTASH_REDIS_REST_TOKEN are missing. The post-activity and ai-draft server actions will " +
      "answer SERVICE_UNAVAILABLE. Set both GitHub production secrets, and add them to the env " +
      "file the deploy workflow writes, or this deployment has no abuse controls at all.",
  );
}

/** One breaker for both limiters: same Upstash dependency, same failure. */
const upstashBreaker = new CircuitBreaker();

/**
 * Store per limiter, so the development fallbacks stay separate as before.
 * Production always gets the shared Upstash store, or null in a deploy that
 * never wired it up (which then fails closed, see storeFor's callers).
 */
function storeFor(): RateLimitStore | null {
  if (upstashRedis) return new UpstashRateLimitStore(upstashRedis);
  if (required) return null;
  return new MemoryRateLimitStore();
}

/**
 * Shared limiter for the post-activity actions (`logPostView`,
 * `logPostActivity`, `logPostShared`, `logPostArrangement`,
 * `logPostContact`): 100 requests per minute per client IP.
 */
export const postActivityLimiter = new SharedRateLimiter({
  ...POST_ACTIVITY_LIMIT,
  store: storeFor(),
  breaker: upstashBreaker,
});

/**
 * Shared limiter for the AI listing draft action (`generateListingDraft`):
 * 10 drafts per hour per user.
 */
export const aiDraftLimiter = new SharedRateLimiter({
  ...AI_DRAFT_LIMIT,
  store: storeFor(),
  breaker: upstashBreaker,
});
