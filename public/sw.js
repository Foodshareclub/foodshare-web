// Service Worker for FoodShare
// Provides offline functionality and caching

const STATIC_CACHE = "foodshare-static-v3";
const DYNAMIC_CACHE = "foodshare-dynamic-v3";

// Assets to cache immediately on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/logo192.png", "/logo512.png"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip Supabase API calls (always fetch fresh)
  if (request.url.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        event.waitUntil(updateCache(request));
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Clone response as it can only be consumed once
          const responseClone = response.clone();

          // Cache successful responses
          if (response.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Network failed, return offline page if available
          return caches.match("/index.html");
        });
    })
  );
});

// Helper: Update cache in background
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response);
    }
  } catch {
    // Silently ignore cache update failures
  }
}
