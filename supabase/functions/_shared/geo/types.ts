/**
 * Geo Types
 *
 * Extracted from `_shared/distance.ts` — no changes.
 */

/**
 * Supported distance units
 */
export type DistanceUnit = "kilometers" | "miles";

/**
 * Geographic coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Distance result with both units
 */
export interface DistanceResult {
  /** Distance in kilometers (source of truth) */
  km: number;
  /** Distance in miles (derived) */
  miles: number;
}

/**
 * Formatted distance for display
 */
export interface FormattedDistance {
  /** Numeric value in the specified unit */
  value: number;
  /** Unit symbol (km, mi, m, ft) */
  unit: string;
  /** Full formatted string (e.g., "5.2 km") */
  formatted: string;
}

/**
 * Slider configuration for a specific unit
 */
export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: DistanceUnit;
}
