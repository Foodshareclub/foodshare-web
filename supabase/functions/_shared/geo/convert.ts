/**
 * Unit Conversion (km ⇄ miles)
 *
 * Backend stores kilometers; conversion happens at the API boundary.
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { CONVERSION } from "./constants.ts";
import type { DistanceResult, DistanceUnit } from "./types.ts";

/**
 * Convert kilometers to miles
 *
 * @param km - Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * CONVERSION.KM_TO_MILES;
}

/**
 * Convert miles to kilometers
 *
 * @param miles - Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * CONVERSION.MILES_TO_KM;
}

/**
 * Convert distance from one unit to another
 *
 * @param value - Distance value
 * @param from - Source unit
 * @param to - Target unit
 * @returns Converted distance
 */
export function convertDistance(
  value: number,
  from: DistanceUnit,
  to: DistanceUnit,
): number {
  if (from === to) return value;
  return from === "kilometers" ? kmToMiles(value) : milesToKm(value);
}

/**
 * Get distance in both units
 *
 * @param km - Distance in kilometers
 * @returns Object with distance in both km and miles
 */
export function getDistanceInBothUnits(km: number): DistanceResult {
  return {
    km,
    miles: kmToMiles(km),
  };
}

/**
 * Convert a radius value from user's unit to kilometers (for API calls)
 *
 * @param value - Radius value in user's preferred unit
 * @param userUnit - User's preferred distance unit
 * @returns Radius in kilometers
 */
export function radiusToKm(value: number, userUnit: DistanceUnit): number {
  return userUnit === "miles" ? milesToKm(value) : value;
}

/**
 * Convert a radius from kilometers to user's preferred unit (for display)
 *
 * @param km - Radius in kilometers
 * @param userUnit - User's preferred distance unit
 * @returns Radius in user's unit
 */
export function radiusFromKm(km: number, userUnit: DistanceUnit): number {
  return userUnit === "miles" ? kmToMiles(km) : km;
}
