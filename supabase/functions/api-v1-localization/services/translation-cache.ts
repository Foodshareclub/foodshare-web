/**
 * Translation Cache Layer (Enhanced)
 *
 * Provides Redis caching for content translations with automatic fallback
 * to database if Redis is unavailable.
 *
 * Cache Key Format: trans:{content_type}:{content_id}:{field}:{locale}
 * TTL: 24 hours (hot cache), Database has 90-day retention
 *
 * Improvements:
 * - Batch operations for better performance
 * - Pipeline support for multiple operations (one /pipeline request)
 * - Shared Upstash client: short timeout, no retries, and the shared circuit
 *   breaker (quota/auth/timeout skips Upstash for 10 minutes, then one
 *   half-open try; every miss goes to the database)
 * - Every write carries a TTL (SETEX) and a namespaced key (`trans:`, `user:locale:`)
 * - Cache warming for popular content
 * - Metrics tracking
 *
 * Usage (from BFF or other edge functions):
 *   import { translationCache } from "../services/translation-cache.ts";
 *
 *   // Get single translation
 *   const translation = await translationCache.get("post", "123", "title", "ru");
 *
 *   // Get multiple translations for a content item
 *   const translations = await translationCache.getMultiple("post", "123", ["title", "description"], "ru");
 *
 *   // Cache a translation
 *   await translationCache.set("post", "123", "title", "ru", "Translated text");
 *
 *   // Batch cache multiple items
 *   await translationCache.batchSet(items, locale);
 */

import { logger } from "../../_shared/logger.ts";
import { isConfigured, notConfiguredReason } from "../../_shared/placeholder-config.ts";
import {
  redisBreaker,
  upstashCommand,
  upstashPipeline,
  type UpstashRedisCreds,
  UpstashUnavailableError,
} from "../../_shared/upstash-redis.ts";

const CACHE_TTL = 86400; // 24 hours
const CACHE_PREFIX = "trans";
const USER_LOCALE_PREFIX = "user:locale";
const USER_LOCALE_TTL = 604800; // 7 days

/**
 * Redis client singleton (lazy initialization)
 */
let redisClient: RedisClient | null = null;
let redisInitialized = false;

interface RedisClient {
  get(key: string): Promise<string | null>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  setex(key: string, ttl: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  pipeline(commands: string[][]): Promise<unknown[]>;
}

/**
 * Upstash REST API client.
 *
 * A thin adapter over the shared client (`_shared/upstash-redis.ts`), which
 * supplies the short timeout and the circuit breaker shared with the other
 * Upstash users. It does not retry: a retry against an exhausted quota only
 * spends more of it, and a cache miss is always safe (the database is the
 * source of truth).
 */
class UpstashRestClient implements RedisClient {
  private creds: UpstashRedisCreds;
  constructor(url: string, token: string) {
    this.creds = { url, token };
  }
  async get(key: string): Promise<string | null> {
    const result = await upstashCommand(this.creds, ["GET", key]);
    return result as string | null;
  }
  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    const result = await upstashCommand(this.creds, ["MGET", ...keys]);
    return result as (string | null)[];
  }
  async setex(key: string, ttl: number, value: string): Promise<void> {
    await upstashCommand(this.creds, ["SETEX", key, String(ttl), value]);
  }
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await upstashCommand(this.creds, ["DEL", ...keys]);
  }
  async keys(pattern: string): Promise<string[]> {
    const result = await upstashCommand(this.creds, ["KEYS", pattern]);
    return result as string[];
  }
  /**
   * Send the commands in one `/pipeline` request (same command count, one
   * round trip, one breaker decision).
   */
  async pipeline(commands: string[][]): Promise<unknown[]> {
    return await upstashPipeline(this.creds, commands);
  }
}
/**
 * Log a cache failure, except when Upstash was skipped on purpose. The
 * breaker logs its own open and close transitions, so a skipped call is
 * silent rather than one warning per request.
 */
function warnUnlessSkipped(message: string, error: unknown): void {
  if (error instanceof UpstashUnavailableError && error.skipped) return;
  logger.warn(message, { error: (error as Error).message });
}
async function initClient(): Promise<RedisClient | null> {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  // Support self-hosted Redis HTTP adapter (priority) and Upstash (fallback)
  const redisUrl = Deno.env.get("REDIS_HTTP_URL") ||
    Deno.env.get("UPSTASH_REDIS_REST_URL") ||
    Deno.env.get("UPSTASH_REDIS_URL");
  const redisToken = Deno.env.get("REDIS_HTTP_TOKEN") ||
    Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ||
    Deno.env.get("UPSTASH_REDIS_TOKEN");

  if (!redisUrl || !redisToken || !isConfigured(redisUrl, redisToken)) {
    // The templates' example values are not a configuration. A client
    // built on "your-instance.upstash.io" fails every read, and every
    // failure is retried with a backoff, so every translation lookup
    // paid for three doomed requests before falling back to the
    // database.
    logger.info("Translation cache: Redis not configured, using database only", {
      reason: notConfiguredReason(redisUrl, redisToken),
    });
    return null;
  }

  try {
    redisClient = new UpstashRestClient(redisUrl, redisToken);
    logger.info("Translation cache: Redis HTTP client initialized");
    return redisClient;
  } catch (error) {
    logger.error("Translation cache: Redis init failed", error as Error);
    return null;
  }
}

/** Test helper: forget the lazily built client so the next call re-reads the environment. */
export function resetTranslationCacheForTests(): void {
  redisClient = null;
  redisInitialized = false;
}
/**
 * The Redis client, or null when there is none to use: not configured, or the
 * shared circuit breaker is skipping Upstash (quota, auth or timeout). Callers
 * treat null as a cache miss and go to the database.
 */
async function initRedis(): Promise<RedisClient | null> {
  const client = await initClient();
  if (!client) return null;
  return redisBreaker().wouldSkip() ? null : client;
}
/**
 * Generate cache key
 */
function getCacheKey(
  contentType: string,
  contentId: string,
  field: string,
  locale: string,
): string {
  return `${CACHE_PREFIX}:${contentType}:${contentId}:${field}:${locale}`;
}

/**
 * Translation Cache API (Enhanced)
 */
export const translationCache = {
  /**
   * Get a single translation from cache
   */
  async get(
    contentType: string,
    contentId: string,
    field: string,
    locale: string,
  ): Promise<string | null> {
    const redis = await initRedis();
    if (!redis) return null;

    try {
      const key = getCacheKey(contentType, contentId, field, locale);
      return await redis.get(key);
    } catch (error) {
      warnUnlessSkipped("Translation cache get error", error);
      return null;
    }
  },

  /**
   * Get multiple translations for a content item
   */
  async getMultiple(
    contentType: string,
    contentId: string,
    fields: string[],
    locale: string,
  ): Promise<Record<string, string | null>> {
    const redis = await initRedis();
    const result: Record<string, string | null> = {};

    // Initialize all fields as null
    for (const field of fields) {
      result[field] = null;
    }

    if (!redis) return result;

    try {
      const keys = fields.map((f) => getCacheKey(contentType, contentId, f, locale));
      const values = await redis.mget(...keys);

      for (let i = 0; i < fields.length; i++) {
        result[fields[i]] = values[i];
      }
    } catch (error) {
      warnUnlessSkipped("Translation cache mget error", error);
    }

    return result;
  },

  /**
   * Cache a translation
   */
  async set(
    contentType: string,
    contentId: string,
    field: string,
    locale: string,
    translation: string,
  ): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const key = getCacheKey(contentType, contentId, field, locale);
      await redis.setex(key, CACHE_TTL, translation);
    } catch (error) {
      warnUnlessSkipped("Translation cache set error", error);
    }
  },

  /**
   * Cache multiple translations at once (improved with pipeline)
   */
  async setMultiple(
    contentType: string,
    contentId: string,
    translations: Record<string, string>,
    locale: string,
  ): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const commands = Object.entries(translations).map(
        ([field, translation]) => {
          const key = getCacheKey(contentType, contentId, field, locale);
          return ["SETEX", key, String(CACHE_TTL), translation];
        },
      );

      if (commands.length > 0) {
        await redis.pipeline(commands);
        logger.debug("Cached translations", {
          count: commands.length,
          contentType,
          contentId,
          locale,
        });
      }
    } catch (error) {
      warnUnlessSkipped("Translation cache setMultiple error", error);
    }
  },

  /**
   * Batch cache translations for multiple content items
   */
  async batchSet(
    items: Array<{
      contentType: string;
      contentId: string;
      translations: Record<string, string>;
      locale: string;
    }>,
  ): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const commands: string[][] = [];

      for (const item of items) {
        for (const [field, translation] of Object.entries(item.translations)) {
          const key = getCacheKey(
            item.contentType,
            item.contentId,
            field,
            item.locale,
          );
          commands.push(["SETEX", key, String(CACHE_TTL), translation]);
        }
      }

      if (commands.length > 0) {
        await redis.pipeline(commands);
        logger.debug("Batch cached translations", {
          count: commands.length,
          itemCount: items.length,
        });
      }
    } catch (error) {
      warnUnlessSkipped("Translation cache batchSet error", error);
    }
  },

  /**
   * Delete cached translations for a content item
   */
  async invalidate(
    contentType: string,
    contentId: string,
  ): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const pattern = `${CACHE_PREFIX}:${contentType}:${contentId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug("Translation cache invalidated", {
          keyCount: keys.length,
          contentType,
          contentId,
        });
      }
    } catch (error) {
      warnUnlessSkipped("Translation cache invalidate error", error);
    }
  },

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    const redis = await initRedis();
    return redis !== null;
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    available: boolean;
    totalKeys: number;
    sampleKeys: string[];
  }> {
    const redis = await initRedis();

    if (!redis) {
      return { available: false, totalKeys: 0, sampleKeys: [] };
    }

    try {
      const pattern = `${CACHE_PREFIX}:*`;
      const keys = await redis.keys(pattern);
      return {
        available: true,
        totalKeys: keys.length,
        sampleKeys: keys.slice(0, 10),
      };
    } catch (error) {
      warnUnlessSkipped("Translation cache getStats error", error);
      return { available: false, totalKeys: 0, sampleKeys: [] };
    }
  },
};

export default translationCache;

// =============================================================================
// User Locale Cache (Redis-backed for cross-device sync)
// =============================================================================

/**
 * Cached user locale data
 */
interface CachedUserLocale {
  locale: string;
  updatedAt: string;
  source: string;
}

/**
 * User Locale Cache API
 *
 * Provides Redis caching for user locale preferences enabling:
 * - O(1) lookup for user locale (vs database query)
 * - Cross-device sync on app launch
 * - 7-day TTL with automatic refresh on updates
 *
 * Usage:
 *   import { userLocaleCache } from "../services/translation-cache.ts";
 *
 *   // Get user's cached locale
 *   const locale = await userLocaleCache.get(userId);
 *
 *   // Set user's locale (call after profile update)
 *   await userLocaleCache.set(userId, "ru", "profile_update");
 */
export const userLocaleCache = {
  /**
   * Get a user's cached locale preference
   *
   * @param userId - The user's UUID
   * @returns The locale code (e.g., "en", "ru") or null if not cached
   */
  async get(userId: string): Promise<string | null> {
    const redis = await initRedis();
    if (!redis) return null;

    try {
      const key = `${USER_LOCALE_PREFIX}:${userId}`;
      const cached = await redis.get(key);

      if (cached) {
        const parsed: CachedUserLocale = JSON.parse(cached);
        logger.debug("User locale cache hit", {
          userId,
          locale: parsed.locale,
        });
        return parsed.locale;
      }

      logger.debug("User locale cache miss", { userId });
      return null;
    } catch (error) {
      warnUnlessSkipped("User locale cache get error", error);
      return null;
    }
  },

  /**
   * Set a user's locale preference in cache
   *
   * @param userId - The user's UUID
   * @param locale - The locale code (e.g., "en", "ru", "es")
   * @param source - Source of the update (e.g., "profile_update", "db_fallback", "session_info")
   */
  async set(userId: string, locale: string, source: string): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const key = `${USER_LOCALE_PREFIX}:${userId}`;
      const value: CachedUserLocale = {
        locale,
        updatedAt: new Date().toISOString(),
        source,
      };

      await redis.setex(key, USER_LOCALE_TTL, JSON.stringify(value));
      logger.debug("User locale cached", { userId, locale, source });
    } catch (error) {
      warnUnlessSkipped("User locale cache set error", error);
    }
  },

  /**
   * Delete a user's cached locale (e.g., on sign out)
   *
   * @param userId - The user's UUID
   */
  async delete(userId: string): Promise<void> {
    const redis = await initRedis();
    if (!redis) return;

    try {
      const key = `${USER_LOCALE_PREFIX}:${userId}`;
      await redis.del(key);
      logger.debug("User locale cache deleted", { userId });
    } catch (error) {
      warnUnlessSkipped("User locale cache delete error", error);
    }
  },

  /**
   * Check if Redis is available for locale caching
   */
  async isAvailable(): Promise<boolean> {
    const redis = await initRedis();
    return redis !== null;
  },

  /**
   * Get full cached data including metadata
   */
  async getWithMetadata(userId: string): Promise<CachedUserLocale | null> {
    const redis = await initRedis();
    if (!redis) return null;

    try {
      const key = `${USER_LOCALE_PREFIX}:${userId}`;
      const cached = await redis.get(key);

      if (cached) {
        return JSON.parse(cached) as CachedUserLocale;
      }

      return null;
    } catch (error) {
      warnUnlessSkipped("User locale cache getWithMetadata error", error);
      return null;
    }
  },
};

// =============================================================================
// High-Level Translation Services (for BFF and other consumers)
// =============================================================================

/**
 * Content item with ID for translation lookup
 */
export interface TranslatableContent {
  id: string;
  [key: string]: unknown;
}

/**
 * Translation result for a single content item
 */
export interface ContentTranslations {
  title: string | null;
  description: string | null;
}

/**
 * Fetch translations for multiple content items in batch
 *
 * @param contentType - Type of content (e.g., "post", "challenge", "forum_post")
 * @param items - Array of content items with id property
 * @param locale - Target locale (e.g., "ru", "es")
 * @param fields - Fields to translate (defaults to ["title", "description"])
 * @returns Map of content ID to translations
 */
export async function getContentTranslationsBatch(
  contentType: string,
  items: TranslatableContent[],
  locale: string,
  fields: string[] = ["title", "description"],
): Promise<Map<string, Record<string, string | null>>> {
  const translationsMap = new Map<string, Record<string, string | null>>();

  // Skip if English or no items
  if (locale === "en" || items.length === 0) {
    return translationsMap;
  }

  try {
    // Fetch translations for all items in parallel
    const translationPromises = items.map(async (item) => {
      const contentId = item.id;
      const translations = await translationCache.getMultiple(
        contentType,
        contentId,
        fields,
        locale,
      );
      return { contentId, translations };
    });

    const results = await Promise.all(translationPromises);
    for (const { contentId, translations } of results) {
      translationsMap.set(contentId, translations);
    }

    logger.debug("Translations fetched", {
      itemCount: items.length,
      translatedCount: translationsMap.size,
      locale,
    });
  } catch (error) {
    logger.warn("Failed to fetch content translations", {
      error: (error as Error).message,
    });
  }

  return translationsMap;
}
