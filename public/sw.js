// Service Worker for FoodShare
// Provides offline functionality and caching
// Enterprise-grade: Includes API response caching for map viewport queries

const STATIC_CACHE = "foodshare-static-v5";
const DYNAMIC_CACHE = "foodshare-dynamic-v5";
const API_CACHE = "foodshare-api-v1";
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for API responses

// Assets to cache immediately on install
const STATIC_ASSETS = ["/manifest.json", "/logo192.png", "/logo512.png"];

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
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests (except POST for RPC calls)
  if (request.method !== "GET" && request.method !== "POST") {
    return;
  }

  // Handle map viewport API calls with caching
  if (request.url.includes("supabase.co") && request.url.includes("get_locations_in_viewport")) {
    event.respondWith(handleMapApiRequest(request));
    return;
  }

  // Skip other Supabase API calls (always fetch fresh)
  if (request.url.includes("supabase.co")) {
    return;
  }

  // Skip non-GET requests for regular caching
  if (request.method !== "GET") {
    return;
  }

  // Never cache health check or API routes — always go to network
  if (request.url.includes("/api/")) {
    return;
  }

  // Never cache navigation requests (HTML pages) — always go to network
  // This prevents caching redirects (e.g., maintenance redirects)
  if (request.mode === "navigate") {
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

          // Cache successful responses (only static assets like JS/CSS/images)
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

// Helper: Handle map viewport API requests with caching
async function handleMapApiRequest(request) {
  const cache = await caches.open(API_CACHE);

  // Generate cache key from request body (for POST requests)
  let cacheKey = request.url;
  if (request.method === "POST") {
    try {
      const body = await request.clone().text();
      cacheKey = request.url + "|" + body;
    } catch {
      // Fall back to URL only
    }
  }

  // Check cache first
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const cachedTime = cachedResponse.headers.get("x-cache-time");
    if (cachedTime && Date.now() - parseInt(cachedTime, 10) < API_CACHE_DURATION) {
      // Cache is still fresh
      return cachedResponse;
    }
  }

  // Fetch from network
  try {
    const response = await fetch(request.clone());

    if (response.ok) {
      // Clone and add cache timestamp
      const responseBody = await response.clone().arrayBuffer();
      const headers = new Headers(response.headers);
      headers.set("x-cache-time", Date.now().toString());

      const cachedResponse = new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      // Store in cache
      await cache.put(cacheKey, cachedResponse.clone());

      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return response;
  } catch (error) {
    // Network failed, return cached response if available (even if stale)
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}
