/**
 * Locale Detection (preferred distance unit)
 *
 * Priority: explicit `?unit=` → `X-User-Country` → `Accept-Language` → km.
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { MILES_COUNTRIES } from "./constants.ts";
import type { DistanceUnit } from "./types.ts";

/**
 * Detect preferred distance unit from country code
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "DE")
 * @returns Preferred distance unit for that country
 */
export function detectUnitFromCountry(
  countryCode: string | null | undefined,
): DistanceUnit {
  if (!countryCode) return "kilometers";
  return MILES_COUNTRIES.has(countryCode.toUpperCase()) ? "miles" : "kilometers";
}

/**
 * Detect preferred distance unit from Accept-Language header
 *
 * @param acceptLanguage - Accept-Language header value
 * @returns Preferred distance unit
 */
export function detectUnitFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): DistanceUnit {
  if (!acceptLanguage) return "kilometers";

  // Extract country codes from Accept-Language (e.g., "en-US" -> "US")
  const matches = acceptLanguage.matchAll(/([a-z]{2})-([A-Z]{2})/gi);
  for (const match of matches) {
    const countryCode = match[2].toUpperCase();
    if (MILES_COUNTRIES.has(countryCode)) {
      return "miles";
    }
  }

  return "kilometers";
}

/**
 * Detect preferred distance unit from request
 *
 * Priority:
 * 1. Explicit unit parameter in request
 * 2. X-User-Country header
 * 3. Accept-Language header
 * 4. Default to kilometers
 *
 * @param request - HTTP request object
 * @returns Preferred distance unit
 */
export function detectUnitFromRequest(request: Request): DistanceUnit {
  // Check for explicit unit parameter
  const url = new URL(request.url);
  const explicitUnit = url.searchParams.get("unit");
  if (explicitUnit === "miles" || explicitUnit === "mi") return "miles";
  if (explicitUnit === "kilometers" || explicitUnit === "km") {
    return "kilometers";
  }

  // Check X-User-Country header (set by geolocation middleware)
  const countryHeader = request.headers.get("X-User-Country");
  if (countryHeader) {
    return detectUnitFromCountry(countryHeader);
  }

  // Fall back to Accept-Language
  const acceptLanguage = request.headers.get("Accept-Language");
  return detectUnitFromAcceptLanguage(acceptLanguage);
}
