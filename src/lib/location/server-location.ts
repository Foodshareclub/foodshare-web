import "server-only";

import {
  LOCATION_COOKIE_NAME,
  type LocationSource,
  isLegacyHardcodedCoordinates,
  isStaleFallbackLocation,
  parseLocationCookie,
  resolveApproximateLocationFromHeaders,
} from "@/lib/location/approximate-location";
import { cookies, headers } from "next/headers";

export interface ResolvedServerLocation {
  lat: number;
  lng: number;
  radius: number;
  city?: string;
  country?: string;
  source: LocationSource;
  approximate: boolean;
}

/**
 * Parses location params from search query (lat, lng, radius).
 * Automatically discards legacy hardcoded Berlin fallbacks (52.52, 13.405).
 */
function parseUrlCoordinates(
  params: {
    lat?: string;
    lng?: string;
    radius?: string;
  },
  defaultRadius: number,
): { lat: number; lng: number; radius: number } | null {
  const lat = params.lat ? Number.parseFloat(params.lat) : null;
  const lng = params.lng ? Number.parseFloat(params.lng) : null;
  const radius = params.radius ? Number.parseInt(params.radius, 10) : defaultRadius;

  if (
    lat === null ||
    lng === null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    isLegacyHardcodedCoordinates(lat, lng)
  ) {
    return null;
  }

  return { lat, lng, radius: Math.max(100, Math.min(50000, radius)) };
}

/**
 * Resolves user location for Server-Side Rendering (SSR):
 * 1. Honors explicit `distance=any` to show unrestricted global listings.
 * 2. Reads direct user-selected URL query params (`lat`, `lng`).
 * 3. Reads persistent `user-location` cookie.
 * 4. Resolves from dynamic Edge Headers (`cf-iplatitude`, `x-vercel-ip-latitude`).
 * 5. Returns null if unresolvable (zero hardcoded fallback guesses).
 */
export async function resolveServerLocation({
  searchParams,
  defaultRadius = 5000,
}: {
  searchParams: {
    lat?: string;
    lng?: string;
    radius?: string;
    distance?: string;
  };
  defaultRadius?: number;
}): Promise<ResolvedServerLocation | null> {
  // 1. Explicit unrestricted distance requested by user
  if (searchParams.distance === "any") {
    return null;
  }

  // 2. Direct URL coordinates (rejects legacy hardcoded fallbacks)
  const urlCoords = parseUrlCoordinates(searchParams, defaultRadius);
  if (urlCoords) {
    return {
      lat: urlCoords.lat,
      lng: urlCoords.lng,
      radius: urlCoords.radius,
      source: "manual",
      approximate: false,
    };
  }

  let reqHeaders: { get(name: string): string | null } | null = null;
  try {
    reqHeaders = await headers();
  } catch {
    // Headers read failed or unavailable
  }

  // 3. Persistent location cookie (rejects legacy stale fallbacks)
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(LOCATION_COOKIE_NAME)?.value;
    const cookieLocation = parseLocationCookie(cookieVal);
    if (cookieLocation && !isStaleFallbackLocation(cookieLocation)) {
      return {
        lat: cookieLocation.latitude,
        lng: cookieLocation.longitude,
        radius: defaultRadius,
        city: cookieLocation.city,
        country: cookieLocation.country,
        source: cookieLocation.source,
        approximate: cookieLocation.approximate,
      };
    }
  } catch {
    // Cookie read failed or unavailable
  }

  // 4. Cloudflare / Vercel edge headers (real dynamic edge coordinates only)
  if (reqHeaders) {
    try {
      const edgeLoc = resolveApproximateLocationFromHeaders(reqHeaders);
      if (edgeLoc) {
        return {
          lat: edgeLoc.latitude,
          lng: edgeLoc.longitude,
          radius: defaultRadius,
          city: edgeLoc.city,
          country: edgeLoc.country,
          source: edgeLoc.source,
          approximate: edgeLoc.approximate,
        };
      }
    } catch {
      // Headers processing failed
    }
  }

  // Zero hardcoded guessing: if unknown, return null for clean client resolution
  return null;
}
