/**
 * Request Deduplication Utility
 *
 * Prevents duplicate in-flight requests by caching pending promises.
 * Supports both in-memory (single instance) and Redis (cross-instance) deduplication.
 *
 * @example
 * ```ts
 * // Create a deduplicator with 10 second TTL
 * const { dedupe, cleanup } = createRequestDeduplicator<UserData>({ ttl: 10000 });
 *
 * // Use it to wrap fetch calls
 * const user = await dedupe(`user-${userId}`, () => fetchUser(userId));
 *
 * // For cross-instance deduplication (serverless), use Redis:
 * const { dedupeWithRedis } = createRequestDeduplicator<UserData>({ ttl: 10000 });
 * const user = await dedupeWithRedis(`user-${userId}`, () => fetchUser(userId));
 * ```
 */

import { isRequestInFlight, markRequestInFlight, clearRequestInFlight, REDIS_TTL } from "./redis";

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface DeduplicatorConfig {
  /** Time-to-live in milliseconds before stale requests are cleaned up (default: 10000) */
  ttl?: number;
  /** Window size in milliseconds for key generation (used with windowed keys) */
  windowMs?: number;
}

interface RequestDeduplicator<T> {
  /** Deduplicate a request by key (in-memory, single instance) */
  dedupe: (key: string, fetchFn: () => Promise<T>) => Promise<T>;
  /** Deduplicate with Redis (cross-instance, serverless-friendly) */
  dedupeWithRedis: (key: string, fetchFn: () => Promise<T>) => Promise<T>;
  /** Manually clean up stale requests */
  cleanup: () => void;
  /** Clear all pending requests */
  clear: () => void;
  /** Get the number of pending requests */
  size: () => number;
}

/**
 * Create a request deduplicator with configurable TTL
 * Supports both in-memory and Redis-based deduplication
 */
export function createRequestDeduplicator<T = unknown>(
  config: DeduplicatorConfig = {}
): RequestDeduplicator<T> {
  const { ttl = 10000 } = config;
  const pendingRequests = new Map<string, PendingRequest<T>>();

  function cleanup(): void {
    const now = Date.now();
    for (const [key, value] of pendingRequests.entries()) {
      if (now - value.timestamp > ttl) {
        pendingRequests.delete(key);
      }
    }
  }

  /**
   * In-memory deduplication (single instance only)
   */
  function dedupe(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Clean up stale requests first
    cleanup();

    const existing = pendingRequests.get(key);
    if (existing) {
      return existing.promise;
    }

    const promise = fetchFn().finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  /**
   * Redis-based deduplication (cross-instance, serverless-friendly)
   * Falls back to in-memory if Redis is unavailable
   */
  async function dedupeWithRedis(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Check if request is already in-flight (Redis)
    const inFlight = await isRequestInFlight(key);
    if (inFlight) {
      // Wait a bit and retry - another instance is handling this
      await new Promise((resolve) => setTimeout(resolve, 100));
      // After waiting, just execute (the other instance should be done)
      return fetchFn();
    }

    // Try to mark as in-flight
    const marked = await markRequestInFlight(key, Math.ceil(ttl / 1000) || REDIS_TTL.DEDUP);

    if (!marked) {
      // Redis unavailable or race condition - fall back to in-memory
      return dedupe(key, fetchFn);
    }

    try {
      return await fetchFn();
    } finally {
      // Clear the in-flight marker
      await clearRequestInFlight(key);
    }
  }

  function clear(): void {
    pendingRequests.clear();
  }

  function size(): number {
    return pendingRequests.size;
  }

  return { dedupe, dedupeWithRedis, cleanup, clear, size };
}

/**
 * Generate a windowed deduplication key
 * Groups requests within the same time window together
 *
 * @example
 * ```ts
 * // Creates keys like "user-123-anon-1234567890"
 * const key = getWindowedKey("user", [userId, "anon"], 5000);
 * ```
 */
export function getWindowedKey(
  prefix: string,
  parts: (string | number | undefined)[],
  windowMs: number
): string {
  const windowId = Math.floor(Date.now() / windowMs);
  const partString = parts.map((p) => p ?? "").join("-");
  return `${prefix}-${partString}-${windowId}`;
}

/**
 * Default deduplicator instance for general use
 * Uses 10 second TTL
 */
export const defaultDeduplicator = createRequestDeduplicator({ ttl: 10000 });
