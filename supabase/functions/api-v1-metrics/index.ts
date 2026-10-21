/**
 * Prometheus Metrics Export Edge Function
 *
 * Exposes platform metrics in Prometheus format for external monitoring.
 * Also handles user event tracking for analytics.
 *
 * Endpoints:
 * - GET  /api-v1-metrics - Prometheus text format metrics
 * - GET  /api-v1-metrics?format=json - JSON format metrics
 * - POST /api-v1-metrics/event - Track single event
 * - POST /api-v1-metrics/events - Track batch events
 *
 * Metrics exported:
 * - Web Vitals (LCP, FID, CLS, INP, TTFB, FCP) - P50, P75, P95
 * - Error rates (5m, 1h, 24h)
 * - Request counts
 * - Active users
 * - Database connection pool stats
 *
 * Headers:
 * - Authorization: Bearer <jwt> (admin for metrics, user for events)
 *
 * @module api-v1-metrics
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "./lib/handlers/index.ts";
import { metricsQuerySchema } from "./lib/schemas.ts";

const VERSION = "2.0.0";
const healthCheck = createHealthHandler("api-v1-metrics", VERSION);
const { handleGet, handlePost } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-metrics",
  version: "2.0.0",
  requireAuth: false, // Allow unauthenticated scraping, but check role if authenticated
  rateLimit: {
    limit: 100,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      querySchema: metricsQuerySchema,
      handler: handleGet,
    },
    POST: {
      handler: handlePost,
      requireAuth: true,
    },
  },
}));
