/**
 * Distance Utilities for Edge Functions — backward-compatible shim.
 *
 * Provides consistent distance calculations, unit conversions, and formatting
 * across all FoodShare backend services.
 *
 * Design Principles:
 * - Backend stores and calculates everything in kilometers (SI units)
 * - Conversion to miles happens at the API boundary when needed
 * - Locale detection determines user's preferred unit
 * - All public functions are pure and side-effect free
 *
 * The 740-line god-file was decomposed into the `_shared/geo/` module
 * family (constants, types, core, convert, locale, format, slider,
 * response, validate). This shim re-exports everything so existing
 * importers (`../_shared/distance.ts`) keep working unchanged.
 *
 * @version 1.0.0
 */

export * from "./geo/index.ts";
