/**
 * API Response Helpers (distances)
 *
 * `*_km` field augmentation + dual-unit response builder.
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { formatDistanceString, roundDistance } from "./format.ts";
import { kmToMiles } from "./convert.ts";

/**
 * Transform distance values in a response based on user preference
 *
 * Recursively finds all `*_km` fields and optionally adds `*_miles` equivalents
 *
 * @param data - Response data object
 * @param includeAlternateUnit - Whether to include both units
 * @returns Transformed data
 */
export function transformDistancesInResponse<T extends Record<string, unknown>>(
  data: T,
  includeAlternateUnit = true,
): T {
  if (!data || typeof data !== "object") return data;

  const result = { ...data };

  for (const [key, value] of Object.entries(result)) {
    // Recursively handle nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = transformDistancesInResponse(
        value as Record<string, unknown>,
        includeAlternateUnit,
      );
    } // Handle arrays
    else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        item && typeof item === "object"
          ? transformDistancesInResponse(
            item as Record<string, unknown>,
            includeAlternateUnit,
          )
          : item
      );
    } // Transform *_km fields
    else if (
      key.endsWith("_km") && typeof value === "number" && includeAlternateUnit
    ) {
      const milesKey = key.replace(/_km$/, "_miles");
      (result as Record<string, unknown>)[milesKey] = roundDistance(
        kmToMiles(value),
      );
    } // Transform distanceKm camelCase
    else if (
      key === "distanceKm" && typeof value === "number" && includeAlternateUnit
    ) {
      (result as Record<string, unknown>)["distanceMiles"] = roundDistance(
        kmToMiles(value),
      );
    } // Transform radiusKm camelCase
    else if (
      key === "radiusKm" && typeof value === "number" && includeAlternateUnit
    ) {
      (result as Record<string, unknown>)["radiusMiles"] = roundDistance(
        kmToMiles(value),
      );
    }
  }

  return result as T;
}

/**
 * Create a distance object with both units for API response
 *
 * @param km - Distance in kilometers
 * @returns Object with formatted values in both units
 */
export function createDistanceResponse(km: number): {
  km: number;
  miles: number;
  formatted: {
    metric: string;
    imperial: string;
  };
} {
  return {
    km: roundDistance(km),
    miles: roundDistance(kmToMiles(km)),
    formatted: {
      metric: formatDistanceString(km, "kilometers"),
      imperial: formatDistanceString(km, "miles"),
    },
  };
}
