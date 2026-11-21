/**
 * Redis/Upstash cache helpers
 *
 * Provides caching helpers for:
 * - Leaderboard caching
 * - Request deduplication
 * - Session management
 *
 * Every call goes through the shared access layer (`@/lib/upstash/access`):
 * one client, one circuit breaker. While the breaker is open (quota
 * exhausted, auth error, timeouts) reads miss and writes are skipped, so
 * callers go straight to the source. Every write has a TTL, and every key is
 * namespaced under `fs:web:`.
 */

import { getUpstashBreaker, isUpstashConfigured, namespacedKey, withUpstash } from "@/lib/upstash/access";

/**
 * Whether Redis is configured and the breaker currently lets calls through.
 */
export function isRedisAvailable(): boolean {
  return isUpstashConfigured() && getUpstashBreaker().state !== "open";
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
 * Returns null if Redis is unavailable, the breaker is open, or the key is missing
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  return withUpstash(
    (redis) => redis.get<T>(namespacedKey(key)),
    () => null,
  );
}

/**
 * Set cached value in Redis with TTL (always set; at least one second)
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = REDIS_TTL.LEADERBOARD): Promise<boolean> {
  const ex = Math.max(1, Math.floor(ttlSeconds));
  return withUpstash(
    async (redis) => {
      await redis.set(namespacedKey(key), value, { ex });
      return true;
    },
    () => false,
  );
}

/**
 * Delete cached value from Redis
 */
export async function cacheDelete(key: string): Promise<boolean> {
  return withUpstash(
    async (redis) => {
      await redis.del(namespacedKey(key));
      return true;
    },
    () => false,
  );
}

/**
 * Delete all keys matching a pattern
 * Uses SCAN for safety (doesn't block Redis)
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  return withUpstash(
    async (redis) => {
      let cursor = 0;
      let deletedCount = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: namespacedKey(pattern), count: 500 });
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);
      return deletedCount;
    },
    () => 0,
  );
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
  ttlSeconds: number = REDIS_TTL.LEADERBOARD,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();

  // Fire and forget; skipped while the breaker is open.
  cacheSet(key, data, ttlSeconds).catch(() => {});

  return data;
}

// ============================================================================
// Leaderboard-specific Helpers
// ============================================================================

/**
 * Get leaderboard cache key
 */
export function getLeaderboardKey(limit = 100): string {
  return `${REDIS_PREFIXES.LEADERBOARD}:top${limit}`;
}

/**
 * Invalidate leaderboard cache
 * Called when a user completes a challenge. While the breaker is open nothing
 * is cached, and older entries expire within REDIS_TTL.LEADERBOARD.
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
  return withUpstash(
    async (redis) => (await redis.exists(namespacedKey(`${REDIS_PREFIXES.DEDUP}:${key}`))) === 1,
    () => false,
  );
}

/**
 * Mark a request as in-flight
 */
export async function markRequestInFlight(key: string, ttlSeconds: number = REDIS_TTL.DEDUP): Promise<boolean> {
  return withUpstash(
    async (redis) => {
      const result = await redis.set(namespacedKey(`${REDIS_PREFIXES.DEDUP}:${key}`), "1", {
        nx: true,
        ex: Math.max(1, Math.floor(ttlSeconds)),
      });
      return result === "OK";
    },
    () => false,
  );
}

/**
 * Clear in-flight marker
 */
export async function clearRequestInFlight(key: string): Promise<boolean> {
  return cacheDelete(`${REDIS_PREFIXES.DEDUP}:${key}`);
}
