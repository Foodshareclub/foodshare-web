/**
 * In-memory cache service
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) return null;

  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number = 300000): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
