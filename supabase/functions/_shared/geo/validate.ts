/**
 * Geo Validation Helpers
 *
 * Coordinate/radius guards with kilometer normalization.
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { SLIDER_CONFIG } from "./constants.ts";
import type { DistanceUnit } from "./types.ts";
import { milesToKm } from "./convert.ts";
import { getSliderConfig } from "./slider.ts";

/**
 * Validate coordinates
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Validate radius value
 *
 * @param radius - Radius value
 * @param unit - Unit of the radius value
 * @returns true if valid (positive and within reasonable bounds)
 */
export function isValidRadius(
  radius: number,
  unit: DistanceUnit = "kilometers",
): boolean {
  if (typeof radius !== "number" || isNaN(radius) || radius <= 0) {
    return false;
  }

  const config = getSliderConfig(unit);
  return radius >= config.min && radius <= config.max;
}

/**
 * Sanitize and validate radius, returning in kilometers
 *
 * @param radius - Input radius value
 * @param unit - Unit of the input value
 * @param defaultKm - Default value in km if invalid
 * @returns Valid radius in kilometers
 */
export function sanitizeRadiusKm(
  radius: unknown,
  unit: DistanceUnit = "kilometers",
  defaultKm = 10,
): number {
  if (typeof radius !== "number" || isNaN(radius) || radius <= 0) {
    return defaultKm;
  }

  const km = unit === "miles" ? milesToKm(radius) : radius;

  // Clamp to valid range
  const { min, max } = SLIDER_CONFIG.kilometers;
  return Math.max(min, Math.min(max, km));
}
