/**
 * Rate Limiting for Server Actions
 *
 * Uses the shared Upstash client and circuit breaker (`@/lib/upstash/access`)
 * while the breaker is closed, and the same limits in memory while it is open
 * (quota exhausted, auth error, timeouts), so a check never fails open and
 * never throws because of Upstash. Analytics are off and every `Ratelimit`
 * has an ephemeral cache, so a blocked identifier costs no command.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { UPSTASH_REQUEST_TIMEOUT_MS, getUpstashAccess } from "@/lib/upstash/access";
import { HybridRateLimiter, MemorySlidingWindowLimiter, upstashRatelimitOptions } from "./localRateLimit";

// Rate limiter configurations for different action types
const LIMITS = {
  // Standard actions: 20 requests per 10 seconds
  standard: { limit: 20, window: "10 s", windowMs: 10_000, prefix: "ratelimit:standard" },
  // Sensitive actions (auth, profile updates): 5 requests per minute
  sensitive: { limit: 5, window: "1 m", windowMs: 60_000, prefix: "ratelimit:sensitive" },
  // Write actions (create/update/delete): 10 requests per minute
  write: { limit: 10, window: "1 m", windowMs: 60_000, prefix: "ratelimit:write" },
  // Strict actions (admin, bulk operations): 3 requests per minute
  strict: { limit: 3, window: "1 m", windowMs: 60_000, prefix: "ratelimit:strict" },
} as const;

type Limiters = Record<keyof typeof LIMITS, HybridRateLimiter>;

let built: { client: unknown; limiters: Limiters } | null = null;

/** Limiters for the current shared client (rebuilt only if the client changes). */
function getLimiters(): Limiters {
  const { client, breaker } = getUpstashAccess();
  if (built && built.client === client) return built.limiters;
  const limiters = {} as Limiters;
  for (const [type, config] of Object.entries(LIMITS) as [
    keyof typeof LIMITS,
    (typeof LIMITS)[keyof typeof LIMITS],
  ][]) {
    limiters[type] = new HybridRateLimiter({
      upstash: client
        ? new Ratelimit({
            redis: client,
            limiter: Ratelimit.slidingWindow(config.limit, config.window),
            prefix: config.prefix,
            ...upstashRatelimitOptions(UPSTASH_REQUEST_TIMEOUT_MS),
          })
        : null,
      memory: new MemorySlidingWindowLimiter({ limit: config.limit, windowMs: config.windowMs }),
      breaker,
    });
  }
  built = { client, limiters };
  return limiters;
}

export type RateLimitType = keyof typeof LIMITS;

/**
 * Get client identifier for rate limiting
 * Uses dynamic import of `next/headers` to avoid Turbopack/PPR build errors
 */
async function getClientIdentifier(): Promise<string> {
  // Lazy-import next/headers only at runtime in Server context
  const { headers: nextHeaders } = await import("next/headers");
  const headersList: any = await nextHeaders();

  // Try to get real IP from various headers
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const cfConnectingIp = headersList.get("cf-connecting-ip");

  // Use first available, falling back to a default
  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0].trim() || "anonymous";

  return ip;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a server action
 * @param type - The type of rate limit to apply
 * @param identifier - Optional custom identifier (defaults to IP)
 * @returns RateLimitResult with success status and metadata
 */
export async function checkRateLimit(type: RateLimitType = "standard", identifier?: string): Promise<RateLimitResult> {
  // Skip rate limiting in development or if Redis not configured
  if (process.env.NODE_ENV !== "production" || !process.env.UPSTASH_REDIS_REST_URL) {
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }

  const id = identifier || (await getClientIdentifier());
  const limiters = getLimiters();
  const limiter = limiters[type] || limiters.standard;

  const { success, limit, remaining, reset } = await limiter.check(id);

  return { success, limit, remaining, reset };
}

/**
 * Rate limit decorator for server actions
 * Throws an error if rate limit is exceeded
 */
export async function requireRateLimit(type: RateLimitType = "standard", identifier?: string): Promise<void> {
  const result = await checkRateLimit(type, identifier);

  if (!result.success) {
    const resetInSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    throw new Error(`Rate limit exceeded. Please try again in ${resetInSeconds} seconds.`);
  }
}

/**
 * Create a rate-limited wrapper for server actions
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  action: (...args: TArgs) => Promise<TReturn>,
  type: RateLimitType = "standard",
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    await requireRateLimit(type);
    return action(...args);
  };
}
