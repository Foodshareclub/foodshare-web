/**
 * Translation Service Worker
 * Handles background sync and offline caching
 */

const CACHE_NAME = "translations-v4";
const API_CACHE_NAME = "translations-api-v4";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("translations-") && name !== CACHE_NAME && name !== API_CACHE_NAME
            )
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle translation API requests
  if (!url.pathname.includes("/functions/v1/get-translations")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.ok) {
          caches.open(API_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline response
          return new Response(
            JSON.stringify({
              success: false,
              error: "offline",
              message: "No network connection and no cached data available",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        });
      })
  );
});

// Background sync event
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-translations") {
    event.waitUntil(syncTranslations());
  }
});

async function syncTranslations() {
  try {
    // Get all cached translation requests
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();

    // Refresh each cached translation
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (err) {
        console.error("[SW] Sync failed for:", request.url, err);
      }
    }

    console.log("[SW] Background sync completed");
  } catch (err) {
    console.error("[SW] Background sync error:", err);
  }
}

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "translations-update") {
    event.waitUntil(syncTranslations());
  }
});

// Message event for manual sync trigger
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_TRANSLATIONS") {
    event.waitUntil(syncTranslations());
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(API_CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
