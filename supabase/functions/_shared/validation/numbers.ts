/**
 * Numeric Input Safety
 *
 * NaN-proof parsing with optional bounds clamping.
 * Extracted from `_shared/validation-rules.ts` — no logic changes.
 */

/**
 * Safely parse an integer with NaN protection
 * Returns defaultValue if parsing fails or result is NaN
 */
export function parseIntSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0,
): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number") {
    return Number.isNaN(value) ? defaultValue : Math.floor(value);
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a float with NaN protection
 * Returns defaultValue if parsing fails or result is NaN/Infinity
 */
export function parseFloatSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0,
): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number") {
    return Number.isNaN(value) || !Number.isFinite(value) ? defaultValue : value;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse an integer with bounds checking
 * Clamps the result to the specified range
 */
export function parseIntSafeWithBounds(
  value: string | number | null | undefined,
  min: number,
  max: number,
  defaultValue?: number,
): number {
  const effectiveDefault = defaultValue ?? min;
  const parsed = parseIntSafe(value, effectiveDefault);
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Safely parse a float with bounds checking
 * Clamps the result to the specified range
 */
export function parseFloatSafeWithBounds(
  value: string | number | null | undefined,
  min: number,
  max: number,
  defaultValue?: number,
): number {
  const effectiveDefault = defaultValue ?? min;
  const parsed = parseFloatSafe(value, effectiveDefault);
  return Math.max(min, Math.min(max, parsed));
}
