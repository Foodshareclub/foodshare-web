/**
 * Redis-based Email Caching and Rate Limiting
 * Provides fast access to email health, quotas, and stats
 *
 * Uses the shared Upstash client and circuit breaker (`@/lib/upstash/access`)
 * instead of a second client of its own. While the breaker is open, reads
 * return their empty value, writes are skipped, the email rate limit counts
 * in memory with the same limits, and locks are held in process. Every key is
 * namespaced under `fs:web:` and every write has a TTL.
 */

import { MemorySlidingWindowLimiter } from "@/lib/security/localRateLimit";
import { namespacedKey, withUpstash } from "@/lib/upstash/access";

const KEYS = {
  health: namespacedKey("email:health:latest"),
  stats: namespacedKey("email:stats:daily"),
  timeseries: namespacedKey("email:metrics:timeseries"),
  alerts: namespacedKey("email:alerts:critical"),
  rateLimit: (email: string) => namespacedKey(`email:ratelimit:${email}`),
  lock: (lockKey: string) => namespacedKey(`email:lock:${lockKey}`),
} as const;

/** Critical alerts are kept for a week. */
const ALERTS_TTL_SECONDS = 7 * 24 * 3600;

// ============================================================================
// Health Caching
// ============================================================================

export interface CachedHealthData {
  timestamp: string;
  providers: Array<{
    provider: string;
    status: string;
    healthScore: number;
    latencyMs: number;
    configured: boolean;
  }>;
  summary: {
    totalProviders: number;
    healthyProviders: number;
    daily: {
      totalSent: number;
      totalLimit: number;
      totalRemaining: number;
      percentUsed: number;
    };
    monthly: {
      totalSent: number;
      totalLimit: number;
      totalRemaining: number;
      percentUsed: number;
    };
    bestProvider: string | null;
  };
  alerts?: string[];
}

export async function getCachedHealth(): Promise<CachedHealthData | null> {
  return withUpstash(
    async (redis) => {
      const data = await redis.get<string | CachedHealthData>(KEYS.health);
      if (!data) return null;
      return typeof data === "string" ? (JSON.parse(data) as CachedHealthData) : data;
    },
    () => null,
  );
}

export async function setCachedHealth(data: CachedHealthData, ttl = 300): Promise<void> {
  await withUpstash(
    async (redis) => {
      await redis.setex(KEYS.health, Math.max(1, Math.floor(ttl)), JSON.stringify(data));
    },
    () => undefined,
  );
}

// ============================================================================
// Rate Limiting
// ============================================================================

const localLimiters = new Map<string, MemorySlidingWindowLimiter>();

function localLimiter(maxAttempts: number, windowSeconds: number): MemorySlidingWindowLimiter {
  const id = `${maxAttempts}:${windowSeconds}`;
  let limiter = localLimiters.get(id);
  if (!limiter) {
    limiter = new MemorySlidingWindowLimiter({ limit: maxAttempts, windowMs: windowSeconds * 1000 });
    localLimiters.set(id, limiter);
  }
  return limiter;
}

/**
 * Check if an email address has exceeded rate limits
 * Uses sliding window rate limiting; counts in memory when Upstash is
 * unavailable, so it does not fail open.
 */
export async function checkRateLimit(
  email: string,
  maxAttempts = 5,
  windowSeconds = 3600,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const fallback = () => {
    const local = localLimiter(maxAttempts, windowSeconds).check(email);
    return { allowed: local.success, remaining: local.remaining, resetAt: Math.floor(local.reset / 1000) };
  };
  return withUpstash(async (redis) => {
    const key = KEYS.rateLimit(email);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    if (count >= maxAttempts) {
      const oldest = await redis.zrange<{ member: string; score: number }[]>(key, 0, 0, { withScores: true });
      const resetAt = oldest.length > 0 ? oldest[0].score + windowSeconds * 1000 : now + windowSeconds * 1000;
      return { allowed: false, remaining: 0, resetAt: Math.floor(resetAt / 1000) };
    }

    await redis.zadd(key, { score: now, member: `${now}` });
    await redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: maxAttempts - count - 1,
      resetAt: Math.floor((now + windowSeconds * 1000) / 1000),
    };
  }, fallback);
}

// ============================================================================
// Stats Tracking
// ============================================================================

export interface DailyStats {
  processed: number;
  successful: number;
  failed: number;
  successRate: number;
}

export async function getDailyStats(): Promise<DailyStats> {
  const stats = await withUpstash(
    (redis) => redis.hgetall<Record<string, number>>(KEYS.stats),
    () => null,
  );
  const processed = Number(stats?.processed) || 0;
  const successful = Number(stats?.successful) || 0;
  const failed = Number(stats?.failed) || 0;
  return {
    processed,
    successful,
    failed,
    successRate: processed > 0 ? Math.round((successful / processed) * 100) : 0,
  };
}

export async function incrementStat(stat: "processed" | "successful" | "failed", amount = 1): Promise<void> {
  await withUpstash(
    async (redis) => {
      await redis.hincrby(KEYS.stats, stat, amount);
      // Expire at midnight UTC so the stats reset daily.
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const ttl = Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      await redis.expire(KEYS.stats, ttl);
    },
    () => undefined,
  );
}

export async function resetDailyStats(): Promise<void> {
  await withUpstash(
    async (redis) => {
      await redis.del(KEYS.stats);
    },
    () => undefined,
  );
}

// ============================================================================
// Metrics Time-Series
// ============================================================================

export interface MetricPoint {
  timestamp: string;
  healthy_providers: number;
  total_providers: number;
  daily_quota_used: number;
  monthly_quota_used: number;
  best_provider: string | null;
}

export async function getMetricsTimeSeries(hours = 24): Promise<MetricPoint[]> {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const results = await withUpstash(
    (redis) => redis.zrange<string[]>(KEYS.timeseries, cutoff, "+inf", { byScore: true }),
    () => [] as string[],
  );
  return results
    .map((r): MetricPoint | null => {
      try {
        return (typeof r === "string" ? JSON.parse(r) : r) as MetricPoint;
      } catch {
        return null;
      }
    })
    .filter((r): r is MetricPoint => r !== null);
}

// ============================================================================
// Alert Management
// ============================================================================

export async function getCriticalAlerts(limit = 10): Promise<string[]> {
  return withUpstash(
    (redis) => redis.lrange(KEYS.alerts, 0, limit - 1),
    () => [] as string[],
  );
}

export async function addCriticalAlert(alert: string): Promise<void> {
  await withUpstash(
    async (redis) => {
      const pipeline = redis.pipeline();
      pipeline.lpush(KEYS.alerts, alert);
      pipeline.ltrim(KEYS.alerts, 0, 99); // Keep last 100
      pipeline.expire(KEYS.alerts, ALERTS_TTL_SECONDS);
      await pipeline.exec();
    },
    () => undefined,
  );
}

// ============================================================================
// Distributed Locking
// ============================================================================

/** In-process locks used while Upstash is unavailable (single web instance). */
const localLocks = new Map<string, { value: string; expiresAt: number }>();

export async function acquireLock(lockKey: string, ttlSeconds = 300): Promise<string | null> {
  const key = KEYS.lock(lockKey);
  const lockValue = crypto.randomUUID();
  return withUpstash(
    async (redis) => {
      const acquired = await redis.set(key, lockValue, { ex: Math.max(1, Math.floor(ttlSeconds)), nx: true });
      return acquired ? lockValue : null;
    },
    () => {
      const now = Date.now();
      const held = localLocks.get(key);
      if (held && held.expiresAt > now) return null;
      const local = `local:${lockValue}`;
      localLocks.set(key, { value: local, expiresAt: now + ttlSeconds * 1000 });
      return local;
    },
  );
}

export async function releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
  const key = KEYS.lock(lockKey);
  if (lockValue.startsWith("local:")) {
    if (localLocks.get(key)?.value !== lockValue) return false;
    localLocks.delete(key);
    return true;
  }
  return withUpstash(
    async (redis) => {
      const current = await redis.get(key);
      if (current === lockValue) {
        await redis.del(key);
        return true;
      }
      return false;
    },
    // The lock expires on its own TTL.
    () => false,
  );
}
