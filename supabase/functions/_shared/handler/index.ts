/**
 * Handler Module Family Barrel
 *
 * Decomposed from the `api-handler.ts` god-file. New code may import deep
 * (`../_shared/handler/factory.ts`); the `../_shared/api-handler.ts` shim
 * re-exports everything so existing importers keep working.
 */

export * from "./types.ts";
export * from "./supabase-factory.ts";
export * from "./auth.ts";
export * from "./idempotency.ts";
export * from "./body-parser.ts";
export * from "./validation.ts";
export * from "./path-params.ts";
export * from "./rate-limit.ts";
export * from "./headers.ts";
export * from "./responses.ts";
export * from "./versioning.ts";
export * from "./factory.ts";
