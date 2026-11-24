/**
 * Public IP Geolocation Engine
 *
 * Provides real IP-based geolocation when Edge CDN headers (Cloudflare / Vercel)
 * are not present (e.g. in local development, direct node server, staging).
 *
 * Features:
 * - Detects loopback & private LAN IPs (127.0.0.1, ::1, 192.168.*, 10.*, 172.16-31.*).
 * - Queries caller's outbound public IP when running locally.
 * - In-memory LRU cache with 24-hour TTL to prevent redundant requests and rate limits.
 * - Bounded 2500ms timeout so API requests never hang.
 */

import { type ApproximateLocation, isValidCoordinates } from "./approximate-location";

interface CachedGeoLocation {
  location: ApproximateLocation;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 1000;
const geoCache = new Map<string, CachedGeoLocation>();

/**
 * Checks whether an IP address is a private, loopback, or link-local address.
 */
export function isPrivateOrLoopbackIp(ip?: string | null): boolean {
  if (!ip) return true;
  const cleanIp = ip.trim().replace(/^::ffff:/, ""); // strip IPv4-mapped IPv6 prefix

  if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.toLowerCase() === "localhost") {
    return true;
  }

  // IPv4 Private ranges
  if (/^10\./.test(cleanIp)) return true;
  if (/^192\.168\./.test(cleanIp)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  if (/^169\.254\./.test(cleanIp)) return true;

  // IPv6 Unique Local and Link-Local
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(cleanIp)) return true;
  if (/^fe80:/i.test(cleanIp)) return true;

  return false;
}

/**
 * Cleans the in-memory cache if it exceeds maximum size
 */
function pruneCacheIfNeeded() {
  if (geoCache.size <= MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of geoCache.entries()) {
    if (entry.expiresAt <= now) {
      geoCache.delete(key);
    }
  }
  // If still oversized, delete oldest entries
  if (geoCache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(geoCache.keys()).slice(0, 200);
    for (const key of keysToDelete) {
      geoCache.delete(key);
    }
  }
}

/**
 * Resolves geolocation for a given IP address or the caller's outbound public IP.
 * Uses ipwho.is with fallback handling and caching.
 */
export async function resolvePublicIpLocation(ip?: string | null): Promise<ApproximateLocation | null> {
  const isPrivate = isPrivateOrLoopbackIp(ip);
  const cacheKey = isPrivate ? "__outbound_self__" : (ip?.trim() || "__outbound_self__");

  // Check in-memory cache
  const cached = geoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location;
  }

  try {
    // When IP is private or loopback (e.g. running on localhost), call ipwho.is without an IP
    // so it geolocates the caller's outbound public IP.
    const url = isPrivate ? "https://ipwho.is/" : `https://ipwho.is/${encodeURIComponent(cacheKey)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: {
        Accept: "application/json",
        "User-Agent": "FoodShare-GeoResolver/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || data.success === false) {
      return null;
    }

    const lat = typeof data.latitude === "number" ? data.latitude : Number.parseFloat(data.latitude);
    const lng = typeof data.longitude === "number" ? data.longitude : Number.parseFloat(data.longitude);

    if (!isValidCoordinates(lat, lng)) {
      return null;
    }

    const location: ApproximateLocation = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      city: typeof data.city === "string" ? data.city : undefined,
      country: typeof data.country_code === "string" ? data.country_code : data.country,
      source: "ip",
      approximate: true,
    };

    // Cache valid result
    pruneCacheIfNeeded();
    geoCache.set(cacheKey, {
      location,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return location;
  } catch (err) {
    // Graceful fallback on network timeout or DNS failure
    return null;
  }
}

/**
 * Clear the cache (primarily for unit testing)
 */
export function clearGeoCacheForTesting(): void {
  geoCache.clear();
}
