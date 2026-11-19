/**
 * Distance Formatting
 *
 * Display strings with automatic small-unit fallback (m/ft).
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { CONVERSION } from "./constants.ts";
import type { DistanceUnit, FormattedDistance } from "./types.ts";
import { kmToMiles } from "./convert.ts";

/**
 * Format distance for display
 *
 * Automatically uses smaller units (meters/feet) for very short distances.
 *
 * @param km - Distance in kilometers
 * @param unit - Display unit preference
 * @param options - Formatting options
 * @returns Formatted distance object
 *
 * @example
 * ```ts
 * formatDistance(5.234, "kilometers")
 * // { value: 5.2, unit: "km", formatted: "5.2 km" }
 *
 * formatDistance(0.15, "kilometers")
 * // { value: 150, unit: "m", formatted: "150 m" }
 *
 * formatDistance(5.234, "miles")
 * // { value: 3.3, unit: "mi", formatted: "3.3 mi" }
 * ```
 */
export function formatDistance(
  km: number,
  unit: DistanceUnit = "kilometers",
  options: {
    /** Number of decimal places (default: 1) */
    decimals?: number;
    /** Use smaller units for short distances (default: true) */
    useSmallUnits?: boolean;
    /** Threshold in km below which to use meters (default: 1) */
    smallUnitThreshold?: number;
  } = {},
): FormattedDistance {
  const { decimals = 1, useSmallUnits = true, smallUnitThreshold = 1 } = options;

  if (unit === "kilometers") {
    // Use meters for very short distances
    if (useSmallUnits && km < smallUnitThreshold) {
      const meters = Math.round(km * CONVERSION.KM_TO_METERS);
      return {
        value: meters,
        unit: "m",
        formatted: `${meters} m`,
      };
    }

    const value = Number(km.toFixed(decimals));
    return {
      value,
      unit: "km",
      formatted: `${value} km`,
    };
  }

  // Miles
  const miles = kmToMiles(km);

  // Use feet for very short distances
  if (useSmallUnits && miles < 0.1) {
    const feet = Math.round(
      km * CONVERSION.KM_TO_METERS * CONVERSION.METERS_TO_FEET,
    );
    return {
      value: feet,
      unit: "ft",
      formatted: `${feet} ft`,
    };
  }

  const value = Number(miles.toFixed(decimals));
  return {
    value,
    unit: "mi",
    formatted: `${value} mi`,
  };
}

/**
 * Format distance as a simple string
 *
 * @param km - Distance in kilometers
 * @param unit - Display unit preference
 * @returns Formatted string (e.g., "5.2 km")
 */
export function formatDistanceString(
  km: number,
  unit: DistanceUnit = "kilometers",
): string {
  return formatDistance(km, unit).formatted;
}

/**
 * Round distance to a sensible precision
 *
 * @param km - Distance in kilometers
 * @returns Rounded distance (1 decimal place)
 */
export function roundDistance(km: number): number {
  return Math.round(km * 10) / 10;
}
