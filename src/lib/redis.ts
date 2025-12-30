/**
 * Redis/Upstash Client Utility
 *
 * Provides a shared Redis client and caching helpers for:
 * - Leaderboard caching
 * - Request deduplication
 * - Session management
 *
 * Uses same Upstash credentials as rate limiting (proxy.ts)
 */

import { Redis } from "@upstash/redis";

// ============================================================================
// Redis Client
// ============================================================================

/**
 * Shared Redis client - null if not configured
 * Same pattern as proxy.ts for consistency
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Check if Redis is configured and available
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}

// ============================================================================
// Cache Helpers
// ============================================================================

/**
 * Cache key prefixes for different data types
 */
export const REDIS_PREFIXES = {
  LEADERBOARD: "cache:leaderboard",
  DEDUP: "dedup",
  SESSION: "session",
} as const;

/**
 * Default TTL values (in seconds)
 */
export const REDIS_TTL = {
  LEADERBOARD: 120, // 2 minutes - matches Next.js cache
  DEDUP: 10, // 10 seconds for request deduplication
  SESSION: 3600, // 1 hour for session data
} as const;

/**
 * Get cached value from Redis
 * Returns null if Redis unavailable or key doesn't exist
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error("[Redis] Get error:", error);
    return null;
  }
}

/**
 * Set cached value in Redis with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = REDIS_TTL.LEADERBOARD
): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error("[Redis] Set error:", error);
    return false;
  }
}

/**
 * Delete cached value from Redis
 */
export async function cacheDelete(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("[Redis] Delete error:", error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * Uses SCAN for safety (doesn't block Redis)
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    let cursor = 0;
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    return deletedCount;
  } catch (error) {
    console.error("[Redis] Delete pattern error:", error);
    return 0;
  }
}

// ============================================================================
// Cache-through Helper
// ============================================================================

/**
 * Cache-through pattern: get from cache or fetch and cache
 *
 * @example
 * const leaderboard = await cacheThrough(
 *   'cache:leaderboard:top100',
 *   () => fetchLeaderboardFromDB(),
 *   120 // 2 minutes
 * );
 */
export async function cacheThrough<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = REDIS_TTL.LEADERBOARD
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result (fire and forget)
  cacheSet(key, data, ttlSeconds).catch(() => {
    // Ignore cache errors - data is still returned
  });

  return data;
}

// ============================================================================
// Leaderboard-specific Helpers
// ============================================================================

/**
 * Get leaderboard cache key
 */
export function getLeaderboardKey(limit: number = 100): string {
  return `${REDIS_PREFIXES.LEADERBOARD}:top${limit}`;
}

/**
 * Invalidate leaderboard cache
 * Called when a user completes a challenge
 */
export async function invalidateLeaderboard(): Promise<boolean> {
  const deleted = await cacheDeletePattern(`${REDIS_PREFIXES.LEADERBOARD}:*`);
  return deleted > 0;
}

// ============================================================================
// Request Deduplication Helpers
// ============================================================================

/**
 * Check if a request is in-flight (for deduplication)
 */
export async function isRequestInFlight(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const exists = await redis.exists(`${REDIS_PREFIXES.DEDUP}:${key}`);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Mark a request as in-flight
 */
export async function markRequestInFlight(
  key: string,
  ttlSeconds: number = REDIS_TTL.DEDUP
): Promise<boolean> {
  if (!redis) return false;

  try {
    // SET NX (only if not exists) with TTL
    const result = await redis.set(`${REDIS_PREFIXES.DEDUP}:${key}`, "1", {
      nx: true,
      ex: ttlSeconds,
    });
    return result === "OK";
  } catch {
    return false;
  }
}

/**
 * Clear in-flight marker
 */
export async function clearRequestInFlight(key: string): Promise<boolean> {
  return cacheDelete(`${REDIS_PREFIXES.DEDUP}:${key}`);
}
