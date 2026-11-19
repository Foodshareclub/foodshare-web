/**
 * Delta Sync Edge Function
 *
 * Provides incremental data synchronization for offline-first clients.
 * Uses version-based tracking to return only changed data since last sync.
 *
 * Endpoints:
 * - POST /sync - Get delta updates for specified tables
 * - POST /sync/pending - Submit pending offline operations
 * - GET /sync/status - Get sync status for user
 *
 * Request body for /sync:
 * {
 *   tables: ["posts", "notifications", "rooms"],
 *   checkpoints?: { posts: 123, notifications: 456 }
 * }
 *
 * Response includes:
 * - Changes per table with new checkpoint versions
 * - Conflict detection for pending operations
 * - Optimized payload (only changed fields)
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { VERSION } from "./lib/config.ts";
import { createRouteHandlers } from "./lib/handlers/index.ts";

const healthCheck = createHealthHandler("api-v1-sync", VERSION);
const { handlePostSync, handleGetSync } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-sync",
  version: "2.0.0",
  requireAuth: true,
  csrf: true,
  rateLimit: {
    limit: 30,
    windowMs: 60000, // 30 sync requests per minute
    keyBy: "user",
  },
  routes: {
    GET: {
      handler: handleGetSync,
    },
    POST: {
      handler: handlePostSync,
    },
  },
}));
