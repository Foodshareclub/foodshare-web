/**
 * Unified Health API v1
 *
 * Consolidates health + health-advanced into a single endpoint.
 *
 * Routes:
 * - GET  /              Quick health (DB ping)
 * - GET  /?full=true    Full health: DB + storage + circuit breakers + metrics + observability
 * - GET  /full          Alias for /?full=true
 * - GET  /metrics       System metrics: memory, errors, performance, circuit breakers
 * - POST /functions     Check all edge functions (fleet check)
 * - POST /functions?quick=true  Quick fleet check (skip slow functions)
 * - POST /functions/:name       Check single edge function
 *
 * @module api-v1-health
 * @version 1.0.0
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { SERVICE } from "./lib/config.ts";
import { handleGet, handlePost } from "./lib/handlers.ts";

Deno.serve(createAPIHandler({
  service: SERVICE,
  version: "1",
  requireAuth: false,
  csrf: false,
  rateLimit: {
    limit: 200,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: { handler: handleGet },
    POST: { handler: handlePost },
  },
}));
