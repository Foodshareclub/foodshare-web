/**
 * Shared Caching Utilities
 *
 * In-memory cache with TTL support for edge functions. The edge runtime
 * isolates per function, so this is a per-isolate best-effort cache.
 *
 * The dead half of this module that used to sit here — the per-profile
 * "getCached*" helpers, the bulk invalidators, the sync cache-through and
 * the cache keys/TTLs only they used — had no call sites anywhere in the
 * estate and was removed. (The `engagement` key builder also had a
 * standing defect: `postIds.sort()` mutated its argument and sorted
 * lexicographically, so the same ID set produced different keys. If an
 * engagement cache is ever needed, rebuild that key canonical.)
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const MAX_CACHE_SIZE = 1000;

class EdgeCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    // Evict oldest entries if the cache is full (Map insertion order)
    while (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      } else {
        break;
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
    this.stats.sets++;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      hitRate: hitRate.toFixed(2) + "%",
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const cache = new EdgeCache();

// Auto-cleanup every 5 minutes
setInterval(() => cache.cleanup(), 300000);

// =============================================================================
// Cache Keys and TTLs
// =============================================================================

/**
 * Predefined cache key patterns
 */
export const CACHE_KEYS = {
  /** User profile by ID */
  profile: (userId: string) => `profile:${userId}`,
  /** User profile by email */
  profileByEmail: (email: string) => `profile:email:${email}`,
  /** Single listing */
  listing: (listingId: string | number) => `listing:${listingId}`,
  /** User's listings */
  userListings: (userId: string) => `listings:user:${userId}`,
  /** Feature flags */
  featureFlags: () => "feature_flags:all",
  /** User feature flags */
  userFeatureFlags: (userId: string) => `feature_flags:user:${userId}`,
  /** Display name by user ID */
  displayName: (userId: string) => `display_name:${userId}`,
  /** Display name admin override by user ID */
  displayNameOverride: (userId: string) => `display_name:override:${userId}`,
  /** Reviews for a user */
  reviews: (userId: string, limit: number) => `reviews:${userId}:${limit}`,
} as const;

/**
 * Predefined TTLs in milliseconds
 */
export const CACHE_TTLS = {
  /** 15 minutes - the cacheThrough default */
  medium: 15 * 60 * 1000,
  /** Categories - 1 hour (also the forum category TTL) */
  categories: 60 * 60 * 1000,
  /** Feature flags - 5 minutes */
  featureFlags: 5 * 60 * 1000,
  /** Display name - 10 minutes */
  displayName: 10 * 60 * 1000,
  /** Reviews - 5 minutes */
  reviews: 5 * 60 * 1000,
} as const;

// =============================================================================
// Cache-Through Pattern
// =============================================================================

/**
 * Options for cache-through operations
 */
export interface CacheThroughOptions {
  /** TTL in milliseconds */
  ttl?: number;
  /** Force refresh (bypass cache) */
  forceRefresh?: boolean;
  /** Custom cache key (overrides default) */
  cacheKey?: string;
}

/**
 * Cache-through helper for cache-aside pattern
 *
 * Automatically handles:
 * - Cache lookup
 * - Cache miss fallback to fetcher
 * - Cache population on miss
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch data on cache miss
 * @param options - Cache options
 * @returns Cached or freshly fetched data
 *
 * @example
 * const profile = await cacheThrough(
 *   CACHE_KEYS.profile(userId),
 *   () => fetchProfileFromDb(userId),
 *   { ttl: CACHE_TTLS.medium }
 * );
 */
export async function cacheThrough<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheThroughOptions = {},
): Promise<T> {
  const { ttl = CACHE_TTLS.medium, forceRefresh = false, cacheKey } = options;
  const effectiveKey = cacheKey || key;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = cache.get<T>(effectiveKey);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (only if data is not null/undefined)
  if (data !== null && data !== undefined) {
    cache.set(effectiveKey, data, ttl);
  }

  return data;
}

// =============================================================================
// Cache Invalidation Helpers
// =============================================================================

/**
 * Invalidate a listing and related caches
 */
export function invalidateListingCache(
  listingId: string | number,
  ownerId?: string,
): void {
  cache.delete(CACHE_KEYS.listing(listingId));
  if (ownerId) {
    cache.delete(CACHE_KEYS.userListings(ownerId));
  }
}

/**
 * Invalidate profile cache for a user
 */
export function invalidateProfileCache(userId: string, email?: string): void {
  cache.delete(CACHE_KEYS.profile(userId));
  if (email) {
    cache.delete(CACHE_KEYS.profileByEmail(email));
  }
}
