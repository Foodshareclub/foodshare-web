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
 * ## When Redis is missing
 *
 * The policy follows the proxy (`rateLimitPolicy`): a production deploy
 * without Upstash fails closed — the affected actions answer with
 * SERVICE_UNAVAILABLE instead of silently running unlimited, because the
 * failure mode of a missing limiter is "unlimited traffic", and a per-
 * instance fallback would quietly recreate the N × limit this module exists
 * to remove. Development and CI (which run the production server without
 * Redis) keep a per-instance in-memory store with exactly the semantics the
 * original in-action Maps had, so local behavior is unchanged.
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
 * web instance. The memory store is the per-process fallback for
 * development and CI, with exactly the semantics the original in-action
 * limiters had.
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
 * The development/CI store: a per-process Map with exactly the semantics
 * the original in-action limiters had (fixed window anchored at the first
 * request, strict `now > resetAt` expiry). Single-instance by construction
 * — production always uses the Upstash store or fails closed.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async increment(key: string, windowMs: number): Promise<RateLimitCountResult | null> {
    const now = this.now();
    const existing = this.entries.get(key);
    if (!existing || now > existing.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + windowMs });
      return { count: 1, ttlMs: windowMs };
    }
    existing.count += 1;
    return { count: existing.count, ttlMs: existing.resetAt - now };
  }
}

// ============================================================================
// Limiter
// ============================================================================

export interface RateLimitVerdict {
  /** True when the request is allowed. */
  success: boolean;
  /**
   * "ok" — allowed; "limited" — the window's budget is exhausted;
   * "unavailable" — no store to count against, or the store did not
   * answer.
   */
  reason: "ok" | "limited" | "unavailable";
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
}

export class SharedRateLimiter {
  constructor(private readonly options: SharedRateLimiterOptions) {}

  /**
   * Count one request for `identifier` and say whether it is allowed.
   *
   * Fails closed. A missing store, or a store that does not answer, is a
   * misconfiguration to be answered loudly, not silently tolerated: the
   * proxy's limiters share this process, this Upstash dependency and this
   * failure domain, and they refuse too (see `rateLimitPolicy.ts` — the
   * failure mode of a missing limiter is "unlimited traffic", and a shared-
   * store limiter that failed open would undo the point of sharing).
   */
  async check(identifier: string): Promise<RateLimitVerdict> {
    const { max, windowMs, prefix, store } = this.options;

    if (!store) {
      return {
        success: false,
        reason: "unavailable",
        remaining: 0,
        retryAfterMs: 0,
      };
    }

    const result = await store.increment(`${prefix}:${identifier}`, windowMs);
    if (result === null) {
      return {
        success: false,
        reason: "unavailable",
        remaining: 0,
        retryAfterMs: 0,
      };
    }

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

/** Store per limiter, so the development fallbacks stay separate as before. */
function storeFor(limit: typeof POST_ACTIVITY_LIMIT | typeof AI_DRAFT_LIMIT): RateLimitStore | null {
  void limit;
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
  store: storeFor(POST_ACTIVITY_LIMIT),
});

/**
 * Shared limiter for the AI listing draft action (`generateListingDraft`):
 * 10 drafts per hour per user.
 */
export const aiDraftLimiter = new SharedRateLimiter({
  ...AI_DRAFT_LIMIT,
  store: storeFor(AI_DRAFT_LIMIT),
});
