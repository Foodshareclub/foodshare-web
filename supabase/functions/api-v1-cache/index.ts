/**
 * Unified Cache Operation Edge Function v5.0
 *
 * Enterprise caching infrastructure for all FoodShare platforms (iOS, Android, Web).
 *
 * Routes:
 *   GET  /api-v1-cache              -> Quick health ping
 *   GET  /api-v1-cache?check=health -> Detailed Redis health
 *   GET  /api-v1-cache?check=services -> All Upstash services health
 *   POST /api-v1-cache              -> Cache operations
 *
 * @version 5.0.0
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { cacheOperationSchema, CONFIG } from "./lib/types.ts";
import { handleGetRequest } from "./lib/health.ts";
import { handleCacheOperation } from "./lib/operations.ts";

// =============================================================================
// Export Handler
// =============================================================================

Deno.serve(createAPIHandler({
  service: "api-v1-cache",
  version: CONFIG.version,
  requireAuth: false,
  csrf: true,
  rateLimit: {
    limit: 100,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      handler: handleGetRequest,
    },
    POST: {
      schema: cacheOperationSchema,
      handler: handleCacheOperation,
      idempotent: true,
    },
  },
}));
