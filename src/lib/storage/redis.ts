/**
 * Upstash Redis cache, rate limit and lock helpers.
 *
 * Built on the shared access layer (`@/lib/upstash/access`): one client and
 * one circuit breaker for the process. While the breaker is open, reads miss
 * and writes are skipped (callers go to the source), the rate limiter counts
 * in memory with the same limits, and locks are held in process (one web
 * instance). Every write has a TTL and every key is namespaced under
 * `fs:web:`.
 */
import type { Redis } from "@upstash/redis";
import { MemorySlidingWindowLimiter } from "@/lib/security/localRateLimit";
import { getUpstashRedis, namespacedKey, withUpstash } from "@/lib/upstash/access";

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

/**
 * Get the shared Redis client.
 * Throws when Upstash is not configured; prefer the `cache` helpers, which
 * degrade instead.
 */
export function getRedis(): Redis {
  const client = getUpstashRedis();
  if (!client) {
    throw new Error("Upstash Redis is not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)");
  }
  return client;
}

function ttlOrDefault(ttlSeconds: number | undefined): number {
  return Math.max(1, Math.floor(ttlSeconds ?? CACHE_TTL.MEDIUM));
}

/**
 * Cache wrapper with automatic JSON serialization and error handling
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return withUpstash(
      (client) => client.get<T>(namespacedKey(key)),
      () => null,
    );
  },

  /**
   * Set cached value. Every write expires: the TTL defaults to CACHE_TTL.MEDIUM.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    return withUpstash(
      async (client) => {
        await client.set(namespacedKey(key), value, { ex: ttlOrDefault(ttlSeconds) });
        return true;
      },
      () => false,
    );
  },

  async del(key: string): Promise<boolean> {
    return withUpstash(
      async (client) => {
        await client.del(namespacedKey(key));
        return true;
      },
      () => false,
    );
  },

  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return withUpstash(
      (client) => client.del(...keys.map(namespacedKey)),
      () => 0,
    );
  },

  async delByPattern(pattern: string): Promise<number> {
    return withUpstash(
      async (client) => {
        const keys = await client.keys(namespacedKey(pattern));
        if (keys.length === 0) return 0;
        return client.del(...keys);
      },
      () => 0,
    );
  },

  async exists(key: string): Promise<boolean> {
    return withUpstash(
      async (client) => (await client.exists(namespacedKey(key))) === 1,
      () => false,
    );
  },

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Increment a counter. The counter expires (default CACHE_TTL.DAY).
   */
  async incr(key: string, ttlSeconds: number = CACHE_TTL.DAY): Promise<number> {
    return withUpstash(
      async (client) => {
        const k = namespacedKey(key);
        const value = await client.incr(k);
        if (value === 1) await client.expire(k, ttlOrDefault(ttlSeconds));
        return value;
      },
      () => 0,
    );
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    return withUpstash(
      async (client) => (await client.expire(namespacedKey(key), seconds)) === 1,
      () => false,
    );
  },

  async ttl(key: string): Promise<number> {
    return withUpstash(
      (client) => client.ttl(namespacedKey(key)),
      () => -1,
    );
  },
};

/** In-memory limiters used while the breaker is open, one per (limit, window). */
const localLimiters = new Map<string, MemorySlidingWindowLimiter>();

function localLimiter(limit: number, windowSeconds: number): MemorySlidingWindowLimiter {
  const id = `${limit}:${windowSeconds}`;
  let limiter = localLimiters.get(id);
  if (!limiter) {
    limiter = new MemorySlidingWindowLimiter({ limit, windowMs: windowSeconds * 1000 });
    localLimiters.set(id, limiter);
  }
  return limiter;
}

/**
 * Rate limiter using sliding window
 */
export const rateLimiter = {
  /**
   * Check if request is allowed. Falls back to the same limit in memory when
   * Upstash is unavailable, so it never fails fully open.
   * @returns { allowed: boolean, remaining: number, reset: number }
   */
  async check(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const fallback = () => {
      const local = localLimiter(limit, windowSeconds).check(identifier);
      return {
        allowed: local.success,
        remaining: local.remaining,
        reset: Math.max(1, Math.ceil((local.reset - Date.now()) / 1000)),
      };
    };
    return withUpstash(async (redis) => {
      const key = namespacedKey(REDIS_KEYS.RATE_LIMIT(identifier));
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);

      if (count >= limit) {
        const oldestEntry = await redis.zrange<{ score: number; member: string }[]>(key, 0, 0, { withScores: true });
        const reset =
          oldestEntry.length > 0 && oldestEntry[0]?.score
            ? Math.ceil((Number(oldestEntry[0].score) + windowSeconds * 1000 - now) / 1000)
            : windowSeconds;
        return { allowed: false, remaining: 0, reset };
      }

      await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      await redis.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: limit - count - 1,
        reset: windowSeconds,
      };
    }, fallback);
  },
};

// Type exports
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

export type CacheTTL = (typeof CACHE_TTL)[keyof typeof CACHE_TTL];

// Cache key prefixes for different data types (namespaced on write)
export const REDIS_KEYS = {
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCTS_LIST: (type?: string) => (type ? `products:list:${type}` : "products:list:all"),
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_SESSION: (id: string) => `user:session:${id}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
  SEARCH_RESULTS: (query: string) => `search:${query}`,
} as const;

/** In-process locks used while Upstash is unavailable (single web instance). */
const localLocks = new Map<string, { token: string; expiresAt: number }>();

function newToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function acquireLocal(lockKey: string, ttlSeconds: number): string | null {
  const now = Date.now();
  const held = localLocks.get(lockKey);
  if (held && held.expiresAt > now) return null;
  const token = `local:${newToken()}`;
  localLocks.set(lockKey, { token, expiresAt: now + ttlSeconds * 1000 });
  return token;
}

/**
 * Distributed lock using Redis
 */
export const lock = {
  /**
   * Acquire a lock
   * @returns lock token if acquired, null if lock is held by another process
   */
  async acquire(key: string, ttlSeconds = 30): Promise<string | null> {
    const lockKey = namespacedKey(`lock:${key}`);
    return withUpstash(
      async (client) => {
        const token = newToken();
        const result = await client.set(lockKey, token, { nx: true, ex: ttlOrDefault(ttlSeconds) });
        return result === "OK" ? token : null;
      },
      () => acquireLocal(lockKey, ttlSeconds),
    );
  },

  /**
   * Release a lock (only if we own it)
   */
  async release(key: string, token: string): Promise<boolean> {
    const lockKey = namespacedKey(`lock:${key}`);
    if (token.startsWith("local:")) {
      const held = localLocks.get(lockKey);
      if (held?.token !== token) return false;
      localLocks.delete(lockKey);
      return true;
    }
    return withUpstash(
      async (client) => {
        const currentToken = await client.get<string>(lockKey);
        if (currentToken === token) {
          await client.del(lockKey);
          return true;
        }
        return false;
      },
      // The lock expires on its own TTL.
      () => false,
    );
  },

  /**
   * Execute a function with a lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>, ttlSeconds = 30): Promise<T | null> {
    const token = await this.acquire(key, ttlSeconds);
    if (!token) {
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.release(key, token);
    }
  },
};
