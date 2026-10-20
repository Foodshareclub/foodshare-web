/**
 * Alerts API Edge Function (api-v1-alerts)
 *
 * Monitors system health and triggers alerts when thresholds are breached.
 * Designed to run via cron trigger every 5 minutes.
 *
 * Monitored Conditions:
 * - Error rate > 5% in 5 minutes
 * - P95 latency > 2 seconds
 * - Circuit breaker opens
 * - Failed login spike (>10x normal)
 * - Vault access failures
 * - Database connection pool exhaustion (>80% utilization)
 *
 * Notification Channels:
 * - Slack webhook
 * - Email to ops team
 * - Database alert log
 *
 * Routes:
 * GET  /                      - Run alert checks (cron compat)
 * POST /                      - Run alert checks { "force": true } to bypass cooldowns
 * POST /webhook/sentry        - Sentry → Telegram forwarding (+ GitHub issues)
 * POST /webhook/xcode-cloud   - Xcode Cloud (terminal build states only) → Telegram
 * GET  /health                - Health check
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { CONFIG } from "./lib/config.ts";
import { createRouteHandlers } from "./lib/handlers.ts";

const healthCheck = createHealthHandler("api-v1-alerts", CONFIG.version);
const { handleGet, handlePost } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-alerts",
  version: CONFIG.version,
  requireAuth: false, // Cron job + webhooks - service-level
  csrf: false, // Sentry webhook posts from external
  rateLimit: {
    limit: 30,
    windowMs: 60_000,
    keyBy: "ip",
  },
  routes: {
    POST: {
      handler: handlePost,
    },
    GET: {
      handler: handleGet,
    },
  },
}));
