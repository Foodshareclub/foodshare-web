/**
 * Approximate Location Resolution
 *
 * Implements privacy-preserving geolocation approximation:
 * 1. Cloudflare Edge Geolocation Headers (cf-iplatitude, cf-iplongitude, cf-ipcity, cf-ipcountry)
 * 2. Timezone / Locale fallback for local development or when edge headers are absent
 * 3. Secure, client-friendly cookie serialization for zero-layout-shift SSR
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

interface LocationMetadata {
  coords: [number, number];
  city: string;
  country: string;
}

// Major timezone mapping with coordinates, city, and country
const TIMEZONE_LOCATION_MAP: Record<string, LocationMetadata> = {
  // Europe
  "Europe/London": { coords: [51.5074, -0.1278], city: "London", country: "GB" },
  "Europe/Paris": { coords: [48.8566, 2.3522], city: "Paris", country: "FR" },
  "Europe/Berlin": { coords: [52.52, 13.405], city: "Berlin", country: "DE" },
  "Europe/Madrid": { coords: [40.4168, -3.7038], city: "Madrid", country: "ES" },
  "Europe/Rome": { coords: [41.9028, 12.4964], city: "Rome", country: "IT" },
  "Europe/Amsterdam": { coords: [52.3676, 4.9041], city: "Amsterdam", country: "NL" },
  "Europe/Prague": { coords: [50.0755, 14.4378], city: "Prague", country: "CZ" },
  "Europe/Warsaw": { coords: [52.2297, 21.0122], city: "Warsaw", country: "PL" },
  "Europe/Vienna": { coords: [48.2082, 16.3738], city: "Vienna", country: "AT" },
  "Europe/Zurich": { coords: [47.3769, 8.5417], city: "Zurich", country: "CH" },
  "Europe/Brussels": { coords: [50.8503, 4.3517], city: "Brussels", country: "BE" },
  "Europe/Stockholm": { coords: [59.3293, 18.0686], city: "Stockholm", country: "SE" },
  "Europe/Oslo": { coords: [59.9139, 10.7522], city: "Oslo", country: "NO" },
  "Europe/Copenhagen": { coords: [55.6761, 12.5683], city: "Copenhagen", country: "DK" },
  "Europe/Dublin": { coords: [53.3498, -6.2603], city: "Dublin", country: "IE" },
  "Europe/Helsinki": { coords: [60.1699, 24.9384], city: "Helsinki", country: "FI" },
  "Europe/Athens": { coords: [37.9838, 23.7275], city: "Athens", country: "GR" },
  "Europe/Lisbon": { coords: [38.7223, -9.1393], city: "Lisbon", country: "PT" },
  "Europe/Bucharest": { coords: [44.4268, 26.1025], city: "Bucharest", country: "RO" },
  "Europe/Budapest": { coords: [47.4979, 19.0402], city: "Budapest", country: "HU" },
  "Europe/Kyiv": { coords: [50.4501, 30.5234], city: "Kyiv", country: "UA" },

  // Americas
  "America/New_York": { coords: [40.7128, -74.006], city: "New York", country: "US" },
  "America/Chicago": { coords: [41.8781, -87.6298], city: "Chicago", country: "US" },
  "America/Los_Angeles": { coords: [34.0522, -118.2437], city: "Los Angeles", country: "US" },
  "America/Denver": { coords: [39.7392, -104.9903], city: "Denver", country: "US" },
  "America/Phoenix": { coords: [33.4484, -112.074], city: "Phoenix", country: "US" },
  "America/Toronto": { coords: [43.6532, -79.3832], city: "Toronto", country: "CA" },
  "America/Vancouver": { coords: [49.2827, -123.1207], city: "Vancouver", country: "CA" },
  "America/Montreal": { coords: [45.5017, -73.5673], city: "Montreal", country: "CA" },
  "America/Mexico_City": { coords: [19.4326, -99.1332], city: "Mexico City", country: "MX" },
  "America/Sao_Paulo": { coords: [-23.5505, -46.6333], city: "São Paulo", country: "BR" },
  "America/Buenos_Aires": { coords: [-34.6037, -58.3816], city: "Buenos Aires", country: "AR" },
  "America/Bogota": { coords: [4.711, -74.0721], city: "Bogota", country: "CO" },
  "America/Santiago": { coords: [-33.4489, -70.6693], city: "Santiago", country: "CL" },

  // Oceania
  "Pacific/Auckland": { coords: [-36.8485, 174.7633], city: "Auckland", country: "NZ" },
  "Australia/Sydney": { coords: [-33.8688, 151.2093], city: "Sydney", country: "AU" },
  "Australia/Melbourne": { coords: [-37.8136, 144.9631], city: "Melbourne", country: "AU" },
  "Australia/Brisbane": { coords: [-27.4698, 153.0251], city: "Brisbane", country: "AU" },
  "Australia/Perth": { coords: [-31.9505, 115.8605], city: "Perth", country: "AU" },

  // Asia
  "Asia/Tokyo": { coords: [35.6762, 139.6503], city: "Tokyo", country: "JP" },
  "Asia/Seoul": { coords: [37.5665, 126.978], city: "Seoul", country: "KR" },
  "Asia/Shanghai": { coords: [31.2304, 121.4737], city: "Shanghai", country: "CN" },
  "Asia/Hong_Kong": { coords: [22.3193, 114.1694], city: "Hong Kong", country: "HK" },
  "Asia/Singapore": { coords: [1.3521, 103.8198], city: "Singapore", country: "SG" },
  "Asia/Bangkok": { coords: [13.7563, 100.5018], city: "Bangkok", country: "TH" },
  "Asia/Dubai": { coords: [25.2048, 55.2708], city: "Dubai", country: "AE" },
  "Asia/Kolkata": { coords: [28.7041, 77.1025], city: "New Delhi", country: "IN" },
  "Asia/Taipei": { coords: [25.033, 121.5654], city: "Taipei", country: "TW" },

  // Africa
  "Africa/Johannesburg": { coords: [-26.2041, 28.0473], city: "Johannesburg", country: "ZA" },
  "Africa/Cairo": { coords: [30.0444, 31.2357], city: "Cairo", country: "EG" },
  "Africa/Nairobi": { coords: [-1.2921, 36.8219], city: "Nairobi", country: "KE" },
  "Africa/Lagos": { coords: [6.5244, 3.3792], city: "Lagos", country: "NG" },
};

// Regional fallback defaults when timezone prefix matches
const REGION_DEFAULTS: Record<string, LocationMetadata> = {
  Europe: { coords: [50.0755, 14.4378], city: "Central Europe", country: "EU" },
  America: { coords: [39.8283, -98.5795], city: "United States", country: "US" },
  Asia: { coords: [34.0479, 100.6197], city: "Asia", country: "AS" },
  Africa: { coords: [-1.2921, 36.8219], city: "Nairobi", country: "KE" },
  Australia: { coords: [-33.8688, 151.2093], city: "Sydney", country: "AU" },
  Pacific: { coords: [-36.8485, 174.7633], city: "Auckland", country: "NZ" },
};

// Default fallback when timezone is unknown
const DEFAULT_FALLBACK: LocationMetadata = {
  coords: [39.8283, -98.5795],
  city: "United States",
  country: "US",
};

/**
 * Validates coordinate pair bounds (-90 <= lat <= 90, -180 <= lng <= 180)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Checks if a cached or cookie location is a stale legacy fallback (e.g. Berlin default)
 * that should be evicted when the client's actual timezone or IP does not match.
 */
export function isStaleFallbackLocation(
  loc?: ApproximateLocation | null,
  clientTimezone?: string | null,
): boolean {
  if (!loc || !loc.approximate) return false;
  // Legacy Berlin default was coords 52.52, 13.405 with city Berlin
  const isLegacyBerlin =
    Math.abs(loc.latitude - 52.52) < 0.01 &&
    Math.abs(loc.longitude - 13.405) < 0.01 &&
    loc.city === "Berlin";
  if (isLegacyBerlin && clientTimezone && !clientTimezone.startsWith("Europe/Berlin")) {
    return true;
  }
  return false;
}

/**
 * Resolves approximate coordinates and city based on timezone
 */
export function resolveLocationFromTimezone(timezone?: string | null): LocationMetadata | null {
  if (timezone) {
    if (TIMEZONE_LOCATION_MAP[timezone]) {
      return TIMEZONE_LOCATION_MAP[timezone];
    }
    const region = timezone.split("/")[0];
    if (region && REGION_DEFAULTS[region]) {
      return REGION_DEFAULTS[region];
    }
    return DEFAULT_FALLBACK;
  }
  return null;
}

/**
 * Extracts approximate location from request headers (Cloudflare or Vercel Edge Geolocation)
 * or falls back to timezone hints.
 * Returns null if neither edge headers nor a timezone hint are present.
 */
export function resolveApproximateLocationFromHeaders(
  headers: { get(name: string): string | null },
  timezoneHint?: string | null,
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
        latitude: lat,
        longitude: lng,
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
        latitude: lat,
        longitude: lng,
        city: vercelCity ? decodeURIComponent(vercelCity) : undefined,
        country: vercelCountry || undefined,
        source: "ip",
        approximate: true,
      };
    }
  }

  // 3. Fallback to timezone hint or edge timezone header
  const effectiveTimezone =
    timezoneHint || headers.get("cf-timezone") || headers.get("x-vercel-ip-timezone");
  const resolved = resolveLocationFromTimezone(effectiveTimezone);

  if (resolved) {
    return {
      latitude: resolved.coords[0],
      longitude: resolved.coords[1],
      city: resolved.city,
      country: resolved.country,
      source: "ip",
      approximate: true,
    };
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
 * Parses and validates location from an HTTP cookie value
 */
export function parseLocationCookie(cookieValue?: string | null): ApproximateLocation | null {
  if (!cookieValue) return null;

  try {
    const raw = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(raw);

    const lat = typeof parsed.lat === "number" ? parsed.lat : Number.parseFloat(parsed.lat);
    const lng = typeof parsed.lng === "number" ? parsed.lng : Number.parseFloat(parsed.lng);

    if (!isValidCoordinates(lat, lng)) {
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
