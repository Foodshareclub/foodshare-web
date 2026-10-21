/**
 * Geo Constants
 *
 * Earth radius, conversion factors, miles-country set, slider presets.
 * Extracted from `_shared/distance.ts` — no value changes.
 */

/**
 * Earth's mean radius in kilometers
 * WGS-84 reference ellipsoid mean radius
 */
export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Conversion factors between distance units
 */
export const CONVERSION = {
  /** Kilometers to miles */
  KM_TO_MILES: 0.621371192,
  /** Miles to kilometers */
  MILES_TO_KM: 1.609344,
  /** Meters to kilometers */
  METERS_TO_KM: 0.001,
  /** Kilometers to meters */
  KM_TO_METERS: 1000,
  /** Feet to meters */
  FEET_TO_METERS: 0.3048,
  /** Meters to feet */
  METERS_TO_FEET: 3.28084,
} as const;

/**
 * Countries that primarily use miles for distance
 * ISO 3166-1 alpha-2 codes
 */
export const MILES_COUNTRIES = new Set([
  "US", // United States
  "GB", // United Kingdom
  "MM", // Myanmar
  "LR", // Liberia
]);

/**
 * Slider configuration for distance radius UI
 */
export const SLIDER_CONFIG = {
  kilometers: {
    min: 1,
    max: 800,
    step: 5,
    defaultValue: 10,
  },
  miles: {
    min: 0.5,
    max: 500,
    step: 5,
    defaultValue: 6, // ~10 km
  },
} as const;
