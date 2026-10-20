/**
 * Radius Slider Helpers
 *
 * UI slider ↔ API kilometer mapping with clamping/snapping.
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { SLIDER_CONFIG } from "./constants.ts";
import type { DistanceUnit, SliderConfig } from "./types.ts";
import { kmToMiles, milesToKm } from "./convert.ts";

/**
 * Get slider configuration for a specific unit
 *
 * @param unit - Distance unit
 * @returns Slider configuration with min, max, step, and default values
 */
export function getSliderConfig(unit: DistanceUnit): SliderConfig {
  const config = unit === "miles" ? SLIDER_CONFIG.miles : SLIDER_CONFIG.kilometers;
  return { ...config, unit };
}

/**
 * Convert slider value to kilometers for API request
 *
 * @param value - Slider value in user's unit
 * @param unit - User's distance unit
 * @returns Value in kilometers
 */
export function sliderValueToKm(value: number, unit: DistanceUnit): number {
  return unit === "miles" ? milesToKm(value) : value;
}

/**
 * Convert kilometers to slider value in user's unit
 *
 * @param km - Value in kilometers
 * @param unit - User's distance unit
 * @returns Slider value in user's unit
 */
export function kmToSliderValue(km: number, unit: DistanceUnit): number {
  return unit === "miles" ? kmToMiles(km) : km;
}

/**
 * Clamp and snap a slider value to valid step
 *
 * @param value - Raw value
 * @param unit - Distance unit
 * @returns Clamped and snapped value
 */
export function snapSliderValue(value: number, unit: DistanceUnit): number {
  const config = getSliderConfig(unit);
  const clamped = Math.max(config.min, Math.min(config.max, value));
  return Math.round(clamped / config.step) * config.step;
}
