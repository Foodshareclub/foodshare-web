/**
 * Upstash Redis Client
 * Used for caching, rate limiting, and session storage
 */
import { Redis } from '@upstash/redis';

// Singleton instance
let redis: Redis | null = null;

/**
 * Get Redis client instance (singleton)
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

/**
 * Cache wrapper with automatic JSON serialization and error handling
 */
export const cache = {
  /**
   * Get cached value with error handling
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedis();
      return await client.get<T>(key);
    } catch (error) {
      console.error(`[Redis] Failed to get key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set cached value with optional TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = getRedis();
      if (ttlSeconds) {
        await client.set(key, value, { ex: ttlSeconds });
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`[Redis] Failed to set key "${key}":`, error);
      return false;
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    try {
      const client = getRedis();
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`[Redis] Failed to delete key "${key}":`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    try {
      const client = getRedis();
      return await client.del(...keys);
    } catch (error) {
      console.error(`[Redis] Failed to delete keys:`, error);
      return 0;
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const client = getRedis();
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return await client.del(...keys);
    } catch (error) {
      console.error(`[Redis] Failed to delete by pattern "${pattern}":`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedis();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Failed to check existence of "${key}":`, error);
      return false;
    }
  },

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      const client = getRedis();
      return await client.incr(key);
    } catch (error) {
      console.error(`[Redis] Failed to increment "${key}":`, error);
      return 0;
    }
  },

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = getRedis();
      return await client.expire(key, seconds);
    } catch (error) {
      console.error(`[Redis] Failed to set expiration on "${key}":`, error);
      return false;
    }
  },

  /**
   * Get TTL of a key in seconds
   */
  async ttl(key: string): Promise<number> {
    try {
      const client = getRedis();
      return await client.ttl(key);
    } catch (error) {
      console.error(`[Redis] Failed to get TTL of "${key}":`, error);
      return -1;
    }
  },
};

/**
 * Rate limiter using sliding window
 */
export const rateLimiter = {
  /**
   * Check if request is allowed
   * @returns { allowed: boolean, remaining: number, reset: number }
   */
  async check(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const redis = getRedis();
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const count = await redis.zcard(key);

    if (count >= limit) {
      const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true });
      const reset = oldestEntry.length > 0 
        ? Math.ceil((Number(oldestEntry[0].score) + windowSeconds * 1000 - now) / 1000)
        : windowSeconds;
      
      return { allowed: false, remaining: 0, reset };
    }

    // Add new entry
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      reset: windowSeconds,
    };
  },
};

// Cache key prefixes for different data types
export const REDIS_KEYS = {
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCTS_LIST: (type?: string) => type ? `products:list:${type}` : 'products:list:all',
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_SESSION: (id: string) => `user:session:${id}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
  SEARCH_RESULTS: (query: string) => `search:${query}`,
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;
