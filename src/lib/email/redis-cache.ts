/**
 * Redis-based Email Caching and Rate Limiting
 * Provides fast access to email health, quotas, and stats
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client (singleton)
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error("Redis environment variables not configured");
    }

    redisClient = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }

  return redisClient;
}

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
  try {
    const redis = getRedis();
    const data = await redis.get<string>("email:health:latest");

    if (!data) return null;

    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    console.error("[redis-cache] Failed to get cached health:", error);
    return null;
  }
}

export async function setCachedHealth(data: CachedHealthData, ttl: number = 300): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex("email:health:latest", ttl, JSON.stringify(data));
  } catch (error) {
    console.error("[redis-cache] Failed to set cached health:", error);
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if an email address has exceeded rate limits
 * Uses sliding window rate limiting
 */
export async function checkRateLimit(
  email: string,
  maxAttempts: number = 5,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const redis = getRedis();
    const key = `email:ratelimit:${email}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count recent attempts
    const count = await redis.zcard(key);

    if (count >= maxAttempts) {
      // Get oldest attempt to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, { withScores: true });
      const resetAt = oldest.length > 0
        ? (oldest[0].score as number) + windowSeconds * 1000
        : now + windowSeconds * 1000;

      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor(resetAt / 1000),
      };
    }

    // Add current attempt
    await redis.zadd(key, { score: now, member: `${now}` });
    await redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: maxAttempts - count - 1,
      resetAt: Math.floor((now + windowSeconds * 1000) / 1000),
    };
  } catch (error) {
    console.error("[redis-cache] Rate limit check failed:", error);
    // Fail open - allow the request
    return { allowed: true, remaining: 0, resetAt: 0 };
  }
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
  try {
    const redis = getRedis();
    const stats = await redis.hgetall<Record<string, number>>("email:stats:daily");

    const processed = stats?.processed || 0;
    const successful = stats?.successful || 0;
    const failed = stats?.failed || 0;

    return {
      processed,
      successful,
      failed,
      successRate: processed > 0 ? Math.round((successful / processed) * 100) : 0,
    };
  } catch (error) {
    console.error("[redis-cache] Failed to get daily stats:", error);
    return { processed: 0, successful: 0, failed: 0, successRate: 0 };
  }
}

export async function incrementStat(
  stat: "processed" | "successful" | "failed",
  amount: number = 1
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.hincrby("email:stats:daily", stat, amount);

    // Set expiration for stats to reset at midnight UTC
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    await redis.expire("email:stats:daily", ttl);
  } catch (error) {
    console.error("[redis-cache] Failed to increment stat:", error);
  }
}

export async function resetDailyStats(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del("email:stats:daily");
  } catch (error) {
    console.error("[redis-cache] Failed to reset daily stats:", error);
  }
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

export async function getMetricsTimeSeries(hours: number = 24): Promise<MetricPoint[]> {
  try {
    const redis = getRedis();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const results = await redis.zrangebyscore("email:metrics:timeseries", cutoff, "+inf");

    return results
      .map((r) => {
        try {
          return typeof r === "string" ? JSON.parse(r) : r;
        } catch {
          return null;
        }
      })
      .filter((r): r is MetricPoint => r !== null);
  } catch (error) {
    console.error("[redis-cache] Failed to get metrics time-series:", error);
    return [];
  }
}

// ============================================================================
// Alert Management
// ============================================================================

export async function getCriticalAlerts(limit: number = 10): Promise<string[]> {
  try {
    const redis = getRedis();
    return await redis.lrange("email:alerts:critical", 0, limit - 1);
  } catch (error) {
    console.error("[redis-cache] Failed to get critical alerts:", error);
    return [];
  }
}

export async function addCriticalAlert(alert: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.lpush("email:alerts:critical", alert);
    await redis.ltrim("email:alerts:critical", 0, 99); // Keep last 100
  } catch (error) {
    console.error("[redis-cache] Failed to add critical alert:", error);
  }
}

// ============================================================================
// Distributed Locking
// ============================================================================

export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 300
): Promise<string | null> {
  try {
    const redis = getRedis();
    const lockValue = crypto.randomUUID();

    const acquired = await redis.set(lockKey, lockValue, {
      ex: ttlSeconds,
      nx: true,
    });

    return acquired ? lockValue : null;
  } catch (error) {
    console.error("[redis-cache] Failed to acquire lock:", error);
    return null;
  }
}

export async function releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const current = await redis.get(lockKey);

    if (current === lockValue) {
      await redis.del(lockKey);
      return true;
    }

    return false;
  } catch (error) {
    console.error("[redis-cache] Failed to release lock:", error);
    return false;
  }
}
