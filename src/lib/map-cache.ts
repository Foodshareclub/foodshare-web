/**
 * Map Cache Layer - IndexedDB Persistence
 * Enterprise-grade caching for map locations with 7-day TTL
 * Survives browser close/reload for faster subsequent loads
 */

import type { LocationType } from "@/types/product.types";
import type { ViewportBounds } from "@/hooks/useDebouncedViewport";

const DB_NAME = "foodshare-map-cache";
const DB_VERSION = 1;
const LOCATIONS_STORE = "locations";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedLocations {
  cacheKey: string;
  data: LocationType[];
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open IndexedDB connection (lazy singleton)
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn("Failed to open map cache DB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create locations store with cacheKey as key
      if (!db.objectStoreNames.contains(LOCATIONS_STORE)) {
        const store = db.createObjectStore(LOCATIONS_STORE, { keyPath: "cacheKey" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a cache key for viewport bounds
 * Rounds to ~1km precision to reduce cache fragmentation
 */
export function generateViewportCacheKey(
  bounds: ViewportBounds,
  postType?: string
): string {
  // Round to 2 decimal places (~1km precision)
  const north = Math.round(bounds.north * 100) / 100;
  const south = Math.round(bounds.south * 100) / 100;
  const east = Math.round(bounds.east * 100) / 100;
  const west = Math.round(bounds.west * 100) / 100;

  const type = postType ?? "all";
  return `${type}:${north},${south},${east},${west}`;
}

/**
 * Get cached locations from IndexedDB
 */
export async function getCachedLocations(
  cacheKey: string
): Promise<LocationType[] | null> {
  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readonly");
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const cached = request.result as CachedLocations | undefined;

        if (!cached) {
          resolve(null);
          return;
        }

        // Check TTL
        const age = Date.now() - cached.timestamp;
        if (age > CACHE_TTL) {
          // Expired, delete and return null
          deleteCachedLocations(cacheKey);
          resolve(null);
          return;
        }

        resolve(cached.data);
      };

      request.onerror = () => {
        console.warn("Failed to get cached locations:", request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.warn("Map cache not available:", error);
    return null;
  }
}

/**
 * Store locations in IndexedDB cache
 */
export async function setCachedLocations(
  cacheKey: string,
  data: LocationType[]
): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readwrite");
      const store = transaction.objectStore(LOCATIONS_STORE);

      const cached: CachedLocations = {
        cacheKey,
        data,
        timestamp: Date.now(),
      };

      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn("Failed to cache locations:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn("Map cache not available:", error);
  }
}

/**
 * Delete cached locations
 */
export async function deleteCachedLocations(cacheKey: string): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readwrite");
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.delete(cacheKey);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Ignore errors on delete
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached locations (useful for invalidation)
 */
export async function clearLocationCache(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readwrite");
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const db = await openDB();
    const cutoff = Date.now() - CACHE_TTL;
    let deletedCount = 0;

    return new Promise((resolve) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readwrite");
      const store = transaction.objectStore(LOCATIONS_STORE);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => resolve(deletedCount);
    });
  } catch {
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entryCount: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}> {
  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(LOCATIONS_STORE, "readonly");
      const store = transaction.objectStore(LOCATIONS_STORE);
      const countRequest = store.count();

      let entryCount = 0;
      let oldestTimestamp: number | null = null;
      let newestTimestamp: number | null = null;

      countRequest.onsuccess = () => {
        entryCount = countRequest.result;
      };

      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as CachedLocations;
          if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
          if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
            newestTimestamp = entry.timestamp;
          }
          cursor.continue();
        } else {
          resolve({ entryCount, oldestTimestamp, newestTimestamp });
        }
      };

      cursorRequest.onerror = () => {
        resolve({ entryCount, oldestTimestamp, newestTimestamp });
      };
    });
  } catch {
    return { entryCount: 0, oldestTimestamp: null, newestTimestamp: null };
  }
}
