/**
 * Approximate Location Resolution (Zero-Hardcoding Architecture)
 *
 * Implements pure dynamic geolocation:
 * 1. Cloudflare Edge Geolocation Headers (cf-iplatitude, cf-iplongitude, cf-ipcity, cf-ipcountry)
 * 2. Vercel Edge Geolocation Headers (x-vercel-ip-latitude, x-vercel-ip-longitude, x-vercel-ip-city, x-vercel-ip-country)
 * 3. Secure, client-friendly cookie serialization for zero-layout-shift SSR
 *
 * Zero hardcoded cities, zero fake coordinates.
 */

export type LocationSource = "gps" | "ip" | "cookie" | "manual";

export interface ApproximateLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  source: LocationSource;
  approximate: boolean;
}

export const LOCATION_COOKIE_NAME = "user-location";
export const LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Validates coordinate pair bounds (-90 <= lat <= 90, -180 <= lng <= 180)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Detects legacy hardcoded Berlin coordinates (52.52, 13.405) that were previously
 * injected into URLs, cookies, or state as a default fallback.
 */
export function isLegacyHardcodedCoordinates(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  return Math.abs(lat - 52.52) < 0.001 && Math.abs(lng - 13.405) < 0.001;
}

/**
 * Checks if a cached or cookie location is a stale legacy fallback (e.g. Berlin default)
 * that should be evicted unconditionally.
 */
export function isStaleFallbackLocation(loc?: ApproximateLocation | null): boolean {
  if (!loc) return false;
  return isLegacyHardcodedCoordinates(loc.latitude, loc.longitude) || loc.city === "Berlin";
}

/**
 * Extracts approximate location from request headers (Cloudflare or Vercel Edge Geolocation).
 * Returns null if no real edge geolocation headers are present.
 */
export function resolveApproximateLocationFromHeaders(
  headers: { get(name: string): string | null },
): ApproximateLocation | null {
  // 1. Cloudflare Edge Geolocation
  const cfLat = headers.get("cf-iplatitude");
  const cfLng = headers.get("cf-iplongitude");
  const cfCity = headers.get("cf-ipcity");
  const cfCountry = headers.get("cf-ipcountry");

  if (cfLat && cfLng) {
    const lat = Number.parseFloat(cfLat);
    const lng = Number.parseFloat(cfLng);

    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        city: cfCity ? decodeURIComponent(cfCity) : undefined,
        country: cfCountry || undefined,
        source: "ip",
        approximate: true,
      };
    }
  }

  // 2. Vercel Edge Geolocation
  const vercelLat = headers.get("x-vercel-ip-latitude");
  const vercelLng = headers.get("x-vercel-ip-longitude");
  const vercelCity = headers.get("x-vercel-ip-city");
  const vercelCountry = headers.get("x-vercel-ip-country");

  if (vercelLat && vercelLng) {
    const lat = Number.parseFloat(vercelLat);
    const lng = Number.parseFloat(vercelLng);

    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        city: vercelCity ? decodeURIComponent(vercelCity) : undefined,
        country: vercelCountry || undefined,
        source: "ip",
        approximate: true,
      };
    }
  }

  return null;
}

/**
 * Serializes location for HTTP cookie storage
 */
export function serializeLocationCookie(location: ApproximateLocation): string {
  return encodeURIComponent(
    JSON.stringify({
      lat: Number(location.latitude.toFixed(6)),
      lng: Number(location.longitude.toFixed(6)),
      city: location.city,
      country: location.country,
      source: location.source,
      approximate: location.approximate,
    }),
  );
}

/**
 * Parses and validates location from an HTTP cookie value.
 * Discards legacy hardcoded fallbacks automatically.
 */
export function parseLocationCookie(cookieValue?: string | null): ApproximateLocation | null {
  if (!cookieValue) return null;

  try {
    const raw = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(raw);

    const lat = typeof parsed.lat === "number" ? parsed.lat : Number.parseFloat(parsed.lat);
    const lng = typeof parsed.lng === "number" ? parsed.lng : Number.parseFloat(parsed.lng);

    if (!isValidCoordinates(lat, lng) || isLegacyHardcodedCoordinates(lat, lng)) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      city: typeof parsed.city === "string" ? parsed.city : undefined,
      country: typeof parsed.country === "string" ? parsed.country : undefined,
      source:
        parsed.source === "gps" || parsed.source === "ip" || parsed.source === "manual" ? parsed.source : "cookie",
      approximate: Boolean(parsed.approximate),
    };
  } catch {
    return null;
  }
}
