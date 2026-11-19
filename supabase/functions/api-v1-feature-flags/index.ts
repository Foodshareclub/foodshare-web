/**
 * Feature Flags API v1
 *
 * Provides feature flags, A/B experiments, and version compatibility checking.
 * Integrates with database functions for deterministic rollout and targeting.
 *
 * Routes:
 * - GET /                      - Get all flags for current user
 * - GET /experiments/:key      - Get/assign experiment variant
 * - GET /compatibility         - Check app version compatibility
 * - GET /health                - Health check
 *
 * Headers:
 * - X-Platform: ios | android | web
 * - X-App-Version: semver string (e.g., "1.2.3")
 *
 * @module api-v1-feature-flags
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { VERSION } from "./lib/config.ts";
import { createRouteHandlers } from "./lib/handlers/index.ts";
import { flagsQuerySchema } from "./lib/schemas.ts";

const healthCheck = createHealthHandler("api-v1-feature-flags", VERSION);
const { handleGet } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-feature-flags",
  version: VERSION,
  requireAuth: false, // Auth is optional — flags work for anonymous users too
  rateLimit: {
    limit: 60,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      querySchema: flagsQuerySchema,
      handler: handleGet,
    },
  },
}));
