/**
 * Validation Module Family Barrel
 *
 * Decomposed from the `validation-rules.ts` god-file. New code may import
 * deep (`../_shared/validation/xss.ts`); the
 * `../_shared/validation-rules.ts` shim re-exports everything so existing
 * importers keep working.
 */

export * from "./constants.ts";
export * from "./types.ts";
export * from "./domain.ts";
export * from "./auth.ts";
export * from "./xss.ts";
export * from "./numbers.ts";

import { VALIDATION } from "./constants.ts";

export default VALIDATION;
