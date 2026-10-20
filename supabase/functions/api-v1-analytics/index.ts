/**
 * Analytics Sync API v1
 *
 * Syncs data from Supabase to MotherDuck for analytics.
 * Supports full and incremental sync strategies with batch processing.
 *
 * Routes:
 * - GET  / - Sync status (last sync times, record counts)
 * - GET  /health - Health check
 * - POST /sync - Trigger sync (mode=full|incremental)
 * - POST /sync (GET for cron compat) - Incremental sync
 *
 * @module api-v1-analytics
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { CONFIG } from "./lib/config.ts";
import { createRouteHandlers } from "./lib/handlers.ts";
import { syncSchema } from "./lib/schemas.ts";

const healthCheck = createHealthHandler("api-v1-analytics", CONFIG.version);
const { handleGetStatus, handleSync } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-analytics",
  version: CONFIG.version,
  requireAuth: false, // Cron + internal; auth handled at config.toml level
  csrf: false, // Service-to-service / cron function
  rateLimit: {
    limit: 10,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      handler: handleGetStatus,
    },
    POST: {
      schema: syncSchema,
      handler: handleSync,
    },
  },
}));
