/**
 * Metrics Read Handler (GET)
 *
 * Admin-gated JSON snapshot or Prometheus scrape.
 * Extracted from `api-v1-metrics/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ForbiddenError } from "../../../_shared/errors.ts";
import type { createHealthHandler } from "../../../_shared/health-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import { getActiveUsers, getErrorRate, getRequestCount } from "../queries.ts";
import { generatePrometheusMetrics } from "../prometheus.ts";
import type { MetricsQuery } from "../schemas.ts";
import type { MetricsResponse, WebVitalsSummary } from "../types.ts";

export async function handleGetMetrics(
  ctx: HandlerContext<unknown, MetricsQuery>,
  healthCheck: ReturnType<typeof createHealthHandler>,
): Promise<Response> {
  // Health check
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/health")) {
    return healthCheck(ctx);
  }

  const { supabase, userId, query, ctx: requestCtx } = ctx;

  // Check admin role if authenticated
  if (userId) {
    // Roles live in `user_roles` (profile_id → role_id → roles.name); they
    // are not a column on `profiles`. Selecting `profiles.role` raised a
    // column error, `profile` came back undefined, and the check below
    // failed closed — so the metrics endpoint answered 403 to every caller,
    // administrators included. Same shape as `api-v1-admin`.
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", userId);

    const roles = (userRoles ?? [])
      .map((r) => (r as { roles?: { name?: string } | null }).roles?.name)
      .filter((n): n is string => typeof n === "string");

    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      throw new ForbiddenError("Admin access required for metrics");
    }
  }

  // Fetch metrics in parallel
  const [
    webVitalsResult,
    errorRate5m,
    errorRate1h,
    errorRate24h,
    activeUsers5m,
    activeUsers1h,
    activeUsers24h,
    requestCount5m,
    requestCount1h,
    requestCount24h,
  ] = await Promise.all([
    supabase.rpc("get_web_vitals_summary", { p_hours: 24 }),
    getErrorRate(supabase, 5),
    getErrorRate(supabase, 60),
    getErrorRate(supabase, 1440),
    getActiveUsers(supabase, 5),
    getActiveUsers(supabase, 60),
    getActiveUsers(supabase, 1440),
    getRequestCount(supabase, 5),
    getRequestCount(supabase, 60),
    getRequestCount(supabase, 1440),
  ]);

  const webVitals: WebVitalsSummary[] = webVitalsResult.data || [];

  // JSON format
  if (query.format === "json") {
    const response: MetricsResponse = {
      webVitals,
      errorRate: {
        last5Min: errorRate5m,
        last1Hour: errorRate1h,
        last24Hours: errorRate24h,
      },
      requestCount: {
        last5Min: requestCount5m,
        last1Hour: requestCount1h,
        last24Hours: requestCount24h,
      },
      activeUsers: {
        last5Min: activeUsers5m,
        last1Hour: activeUsers1h,
        last24Hours: activeUsers24h,
      },
      timestamp: new Date().toISOString(),
    };

    return ok(response, ctx, {
      cacheTTL: 60,
    });
  }

  // Prometheus text format (default)
  const prometheusMetrics = generatePrometheusMetrics(webVitals, {
    errorRate5m,
    errorRate1h,
    errorRate24h,
    activeUsers5m,
    activeUsers1h,
    activeUsers24h,
    requestCount5m,
    requestCount1h,
    requestCount24h,
  });

  logger.info("Metrics exported", {
    format: "prometheus",
    vitalsCount: webVitals.length,
    requestId: requestCtx?.requestId,
  });

  // Return Prometheus format directly
  return new Response(prometheusMetrics, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache, max-age=60",
    },
  });
}
