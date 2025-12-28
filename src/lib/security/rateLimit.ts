/**
 * Rate Limiting for Server Actions
 * Uses Upstash Redis for distributed rate limiting
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Create Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Rate limiter configurations for different action types
const limiters = {
  // Standard actions: 20 requests per 10 seconds
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "ratelimit:standard",
  }),

  // Sensitive actions (auth, profile updates): 5 requests per minute
  sensitive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:sensitive",
  }),

  // Write actions (create/update/delete): 10 requests per minute
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:write",
  }),

  // Strict actions (admin, bulk operations): 3 requests per minute
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 m"),
    analytics: true,
    prefix: "ratelimit:strict",
  }),
};

export type RateLimitType = keyof typeof limiters;

/**
 * Get client identifier for rate limiting
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();

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
export async function checkRateLimit(
  type: RateLimitType = "standard",
  identifier?: string
): Promise<RateLimitResult> {
  // Skip rate limiting in development or if Redis not configured
  if (process.env.NODE_ENV !== "production" || !process.env.UPSTASH_REDIS_REST_URL) {
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }

  const id = identifier || (await getClientIdentifier());
  const limiter = limiters[type];

  const { success, limit, remaining, reset } = await limiter.limit(id);

  return { success, limit, remaining, reset };
}

/**
 * Rate limit decorator for server actions
 * Throws an error if rate limit is exceeded
 */
export async function requireRateLimit(
  type: RateLimitType = "standard",
  identifier?: string
): Promise<void> {
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
  type: RateLimitType = "standard"
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    await requireRateLimit(type);
    return action(...args);
  };
}
