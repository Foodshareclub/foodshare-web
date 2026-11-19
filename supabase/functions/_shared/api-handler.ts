/**
 * Unified API Handler — backward-compatible shim.
 *
 * The 1018-line god-file was decomposed into the `_shared/handler/` module
 * family (types, supabase-factory, auth, idempotency, body-parser,
 * validation, path-params, rate-limit, headers, responses, versioning,
 * factory). This shim re-exports everything so the 50+ existing importers
 * (`../_shared/api-handler.ts`) keep working unchanged.
 *
 * @example
 * ```typescript
 * import { createAPIHandler } from "../_shared/api-handler.ts";
 * import { z } from "zod";
 *
 * const createProductSchema = z.object({
 *   name: z.string().min(1),
 *   description: z.string(),
 *   location: z.object({ lat: z.number(), lng: z.number() }),
 * });
 *
 * export default createAPIHandler({
 *   service: "products-api",
 *   requireAuth: true,
 *   routes: {
 *     GET: { handler: listProducts },
 *     POST: { schema: createProductSchema, handler: createProduct },
 *   },
 * });
 * ```
 */

export * from "./handler/index.ts";

/**
 * Backward-compat alias: the old `api-handler.ts` god-file declared its own
 * `RateLimitConfig` (limit/windowMs/keyBy/distributed/skip). That shape now
 * lives on as `HandlerRateLimitConfig`; the alias preserves the old name for
 * direct `../_shared/api-handler.ts` importers.
 */
export type { HandlerRateLimitConfig as RateLimitConfig } from "./handler/index.ts";
