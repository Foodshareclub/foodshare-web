/**
 * Shared Bot Rate Limiter Factory
 *
 * Generic distributed rate limiting for bot services.
 * Eliminates duplication between Telegram and WhatsApp bots.
 *
 * Usage:
 * ```ts
 * const rateLimiter = createBotRateLimiter({
 *   tableName: "telegram_rate_limits",
 * });
 * const result = await rateLimiter.checkDistributed(userId);
 * ```
 *
 * `tableName` is a closed set (`BotRateLimitTable`); the identifier column is
 * derived from it. Both bots' tables exist in the catalog, so every query
 * here is checked against the real schema.
 */

import { logger } from "../logger.ts";
import { getSupabaseClient } from "../supabase.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * The complete set of tables this limiter manages, and the identifier column
 * each one uses. A closed set on purpose: every query in this file names a
 * literal table and column the compiler checks against the real schema, so a
 * new bot is one more literal here plus a branch — not a string the type
 * system cannot see, which is how a wrong column name ships to production.
 */
export type BotRateLimitTable =
  | "telegram_rate_limits"
  | "whatsapp_rate_limits";

export interface BotRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export interface BotRateLimiterConfig {
  /** Which of the known limiter tables to use: see BotRateLimitTable. */
  tableName: BotRateLimitTable;
  /** Default max requests per window */
  maxRequests?: number;
  /** Default window in milliseconds */
  windowMs?: number;
}

// =============================================================================
// Factory
// =============================================================================

const DEFAULT_MAX_REQUESTS = 30;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const MAX_IN_MEMORY_ENTRIES = 5_000;

export function createBotRateLimiter(config: BotRateLimiterConfig) {
  const {
    tableName,
    maxRequests: defaultMax = DEFAULT_MAX_REQUESTS,
    windowMs: defaultWindow = DEFAULT_WINDOW_MS,
  } = config;

  // Closed set: `BotRateLimitTable` is a union of two literals, so each
  // query below is a literal the compiler checks against the schema.
  const isTelegram = tableName === "telegram_rate_limits";

  // In-memory fallback store (bounded)
  const inMemoryLimits = new Map<string, { count: number; resetAt: number }>();

  /**
   * Distributed rate limit check using Supabase
   */
  async function checkDistributed(
    id: string | number,
    maxRequests = defaultMax,
    windowMs = defaultWindow,
  ): Promise<BotRateLimitResult> {
    const supabase = getSupabaseClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    try {
      const { data: existing } = isTelegram
        ? await supabase
          .from("telegram_rate_limits")
          .select("request_count,window_start")
          .eq("user_id", id)
          .single()
        : await supabase
          .from("whatsapp_rate_limits")
          .select("request_count,window_start")
          .eq("phone_number", String(id))
          .single();

      if (existing) {
        // `window_start` is nullable in the DDL despite its default; `?? 0`
        // keeps the old runtime behaviour (null → epoch → expired window).
        const existingWindowStart = new Date(existing.window_start ?? 0);

        // Window expired — reset
        if (existingWindowStart < windowStart) {
          const reset = {
            request_count: 1,
            window_start: now.toISOString(),
            updated_at: now.toISOString(),
          };
          if (isTelegram) {
            await supabase.from("telegram_rate_limits").upsert({
              user_id: Number(id),
              ...reset,
            });
          } else {
            await supabase.from("whatsapp_rate_limits").upsert({
              phone_number: String(id),
              ...reset,
            });
          }

          return {
            allowed: true,
            remaining: maxRequests - 1,
            resetAt: new Date(now.getTime() + windowMs),
          };
        }

        // Window active — check limit (`request_count` is nullable in the
        // DDL; the default makes NULL unreachable, `?? 0` is the boundary)
        if ((existing.request_count ?? 0) >= maxRequests) {
          const resetAt = new Date(existingWindowStart.getTime() + windowMs);
          const retryAfterSeconds = Math.ceil(
            (resetAt.getTime() - now.getTime()) / 1000,
          );

          return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfterSeconds: Math.max(1, retryAfterSeconds),
          };
        }

        // Increment
        if (isTelegram) {
          await supabase
            .from("telegram_rate_limits")
            .update({
              request_count: (existing.request_count ?? 0) + 1,
              updated_at: now.toISOString(),
            })
            .eq("user_id", id);
        } else {
          await supabase
            .from("whatsapp_rate_limits")
            .update({
              request_count: (existing.request_count ?? 0) + 1,
              updated_at: now.toISOString(),
            })
            .eq("phone_number", String(id));
        }

        return {
          allowed: true,
          remaining: maxRequests - (existing.request_count ?? 0) - 1,
          resetAt: new Date(existingWindowStart.getTime() + windowMs),
        };
      }

      // No existing record — create new
      const fresh = {
        request_count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      };
      if (isTelegram) {
        await supabase.from("telegram_rate_limits").insert({
          user_id: Number(id),
          ...fresh,
        });
      } else {
        await supabase.from("whatsapp_rate_limits").insert({
          phone_number: String(id),
          ...fresh,
        });
      }

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now.getTime() + windowMs),
      };
    } catch (error) {
      // Fail open for availability
      logger.error("Bot rate limit check failed, allowing request", {
        error: String(error),
      });
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }
  }

  /**
   * Synchronous in-memory rate limit check
   */
  function checkSync(
    id: string | number,
    maxRequests = defaultMax,
    windowMs = defaultWindow,
  ): boolean {
    const key = String(id);
    const now = Date.now();
    const userLimit = inMemoryLimits.get(key);

    if (!userLimit || now > userLimit.resetAt) {
      // Evict oldest if full
      if (inMemoryLimits.size >= MAX_IN_MEMORY_ENTRIES) {
        const firstKey = inMemoryLimits.keys().next().value;
        if (firstKey) inMemoryLimits.delete(firstKey);
      }
      inMemoryLimits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  function getRemaining(id: string | number, maxRequests = defaultMax): number {
    const key = String(id);
    const userLimit = inMemoryLimits.get(key);
    if (!userLimit || Date.now() > userLimit.resetAt) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - userLimit.count);
  }

  /**
   * Clean up old rate limit entries from database
   */
  async function cleanup(maxAgeMs = 5 * 60 * 1000): Promise<number> {
    const supabase = getSupabaseClient();
    const cutoff = new Date(Date.now() - maxAgeMs);

    try {
      const { data, error } = isTelegram
        ? await supabase
          .from("telegram_rate_limits")
          .delete()
          .lt("updated_at", cutoff.toISOString())
          .select("user_id")
        : await supabase
          .from("whatsapp_rate_limits")
          .delete()
          .lt("updated_at", cutoff.toISOString())
          .select("phone_number");

      if (error) {
        logger.error("Error cleaning up rate limits", {
          table: tableName,
          error: String(error),
        });
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error("Error in rate limit cleanup", {
        table: tableName,
        error: String(error),
      });
      return 0;
    }
  }

  return {
    checkDistributed,
    checkSync,
    getRemaining,
    cleanup,
  };
}
