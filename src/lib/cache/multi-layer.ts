/**
 * Multi-Layer Cache
 *
 * L1: In-memory (fastest, limited size)
 * L2: IndexedDB (persistent, larger)
 * L3: Service Worker (offline support)
 *
 * @module lib/cache/multi-layer
 */

import { recordCacheHit, recordCacheMiss } from "@/lib/observability/metrics";

// =============================================================================
// Types
// =============================================================================

export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T;
  /** Cache timestamp */
  timestamp: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Cache tags for invalidation */
  tags?: string[];
  /** ETag for conditional requests */
  etag?: string;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Cache tags for invalidation */
  tags?: string[];
  /** Skip L1 (memory) cache */
  skipMemory?: boolean;
  /** Skip L2 (IndexedDB) cache */
  skipIndexedDB?: boolean;
  /** ETag for conditional caching */
  etag?: string;
  /** Stale-while-revalidate: return stale data while fetching fresh */
  staleWhileRevalidate?: boolean;
}

export interface CacheStats {
  /** L1 (memory) stats */
  memory: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  /** L2 (IndexedDB) stats */
  indexedDB: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  /** Total stats */
  total: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// =============================================================================
// L1: Memory Cache
// =============================================================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry;
  }

  set<T>(key: string, entry: CacheEntry<T>): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByTag(tag: string): number {
    let deleted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  deleteByPattern(pattern: RegExp): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// =============================================================================
// L2: IndexedDB Cache
// =============================================================================

const DB_NAME = "foodshare-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";

class IndexedDBCache {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private hits = 0;
  private misses = 0;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("expiresAt", "expiresAt", { unique: false });
          store.createIndex("tags", "tags", { unique: false, multiEntry: true });
        }
      };
    });

    return this.dbPromise;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as { key: string; entry: CacheEntry<T> } | undefined;

          if (!result) {
            this.misses++;
            resolve(null);
            return;
          }

          if (result.entry.expiresAt < Date.now()) {
            // Delete expired entry
            this.delete(key);
            this.misses++;
            resolve(null);
            return;
          }

          this.hits++;
          resolve(result.entry);
        };

        request.onerror = () => {
          this.misses++;
          resolve(null);
        };
      });
    } catch {
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ key, entry });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Silently fail
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        resolve();
      });
    } catch {
      // Silently fail
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    try {
      const db = await this.openDB();
      let deleted = 0;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("tags");
        const request = index.openCursor(IDBKeyRange.only(tag));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };

        request.onerror = () => resolve(deleted);
      });
    } catch {
      return 0;
    }
  }

  async deleteByPattern(pattern: RegExp): Promise<number> {
    try {
      const db = await this.openDB();
      let deleted = 0;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (pattern.test(cursor.key as string)) {
              cursor.delete();
              deleted++;
            }
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };

        request.onerror = () => resolve(deleted);
      });
    } catch {
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        resolve();
      });
    } catch {
      // Silently fail
    }
  }

  async getSize(): Promise<number> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const db = await this.openDB();
      const now = Date.now();
      let deleted = 0;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("expiresAt");
        const request = index.openCursor(IDBKeyRange.upperBound(now));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };

        request.onerror = () => resolve(deleted);
      });
    } catch {
      return 0;
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// =============================================================================
// Multi-Layer Cache
// =============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Multi-layer cache with L1 (memory) and L2 (IndexedDB)
 */
export class MultiLayerCache {
  private l1: MemoryCache;
  private l2: IndexedDBCache;
  private pendingRequests = new Map<string, Promise<unknown>>();

  constructor(memoryMaxSize = 500) {
    this.l1 = new MemoryCache(memoryMaxSize);
    this.l2 = new IndexedDBCache();

    // Periodic cleanup
    if (typeof window !== "undefined") {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Get data from cache (checks L1 → L2)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check L1 first
    const l1Entry = this.l1.get<T>(key);
    if (l1Entry) {
      recordCacheHit();
      return l1Entry.data;
    }

    // Check L2
    const l2Entry = await this.l2.get<T>(key);
    if (l2Entry) {
      // Promote to L1
      this.l1.set(key, l2Entry);
      recordCacheHit();
      return l2Entry.data;
    }

    recordCacheMiss();
    return null;
  }

  /**
   * Get data from cache or fetch if not available
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = DEFAULT_TTL, staleWhileRevalidate = false } = options;

    // Check cache
    const cached = await this.get<T>(key);

    if (cached !== null) {
      if (staleWhileRevalidate) {
        // Return cached data and refresh in background
        this.refreshInBackground(key, fetcher, options);
      }
      return cached;
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Fetch and cache
    const fetchPromise = fetcher().then(async (data) => {
      await this.set(key, data, options);
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Refresh cache in background
   */
  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.set(key, data, options);
    } catch {
      // Silently fail background refresh
    }
  }

  /**
   * Set data in cache (writes to L1 and L2)
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = DEFAULT_TTL,
      tags,
      skipMemory = false,
      skipIndexedDB = false,
      etag,
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      tags,
      etag,
    };

    if (!skipMemory) {
      this.l1.set(key, entry);
    }

    if (!skipIndexedDB) {
      await this.l2.set(key, entry);
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.delete(key);
  }

  /**
   * Delete entries by tag
   */
  async deleteByTag(tag: string): Promise<number> {
    const l1Deleted = this.l1.deleteByTag(tag);
    const l2Deleted = await this.l2.deleteByTag(tag);
    return l1Deleted + l2Deleted;
  }

  /**
   * Delete entries by pattern
   */
  async deleteByPattern(pattern: RegExp): Promise<number> {
    const l1Deleted = this.l1.deleteByPattern(pattern);
    const l2Deleted = await this.l2.deleteByPattern(pattern);
    return l1Deleted + l2Deleted;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.l1.clear();
    await this.l2.clear();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    return this.l2.cleanupExpired();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const memoryStats = this.l1.getStats();
    const indexedDBStats = this.l2.getStats();
    const indexedDBSize = await this.l2.getSize();

    const totalHits = memoryStats.hits + indexedDBStats.hits;
    const totalMisses = memoryStats.misses + indexedDBStats.misses;
    const total = totalHits + totalMisses;

    return {
      memory: memoryStats,
      indexedDB: {
        size: indexedDBSize,
        ...indexedDBStats,
      },
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: total > 0 ? totalHits / total : 0,
      },
    };
  }

  /**
   * Prefetch data into cache
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const cached = await this.get<T>(key);
    if (cached !== null) return;

    try {
      const data = await fetcher();
      await this.set(key, data, options);
    } catch {
      // Silently fail prefetch
    }
  }
}

// =============================================================================
// Default Instance
// =============================================================================

let defaultCache: MultiLayerCache | null = null;

/**
 * Get the default multi-layer cache instance
 */
export function getCache(): MultiLayerCache {
  if (!defaultCache) {
    defaultCache = new MultiLayerCache();
  }
  return defaultCache;
}

/**
 * Get data from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  return getCache().get<T>(key);
}

/**
 * Get data from cache or fetch
 */
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return getCache().getOrFetch(key, fetcher, options);
}

/**
 * Set data in cache
 */
export async function cacheSet<T>(
  key: string,
  data: T,
  options?: CacheOptions
): Promise<void> {
  return getCache().set(key, data, options);
}

/**
 * Delete from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  return getCache().delete(key);
}

/**
 * Delete by tag
 */
export async function cacheDeleteByTag(tag: string): Promise<number> {
  return getCache().deleteByTag(tag);
}

/**
 * Delete by pattern
 */
export async function cacheDeleteByPattern(pattern: RegExp): Promise<number> {
  return getCache().deleteByPattern(pattern);
}

/**
 * Clear all cache
 */
export async function cacheClear(): Promise<void> {
  return getCache().clear();
}

/**
 * Get cache stats
 */
export async function cacheStats(): Promise<CacheStats> {
  return getCache().getStats();
}

// Expose in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).cacheStats = cacheStats;
}
