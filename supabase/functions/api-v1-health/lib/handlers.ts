/**
 * Health Route Handlers (GET quick/full/metrics, POST fleet checks)
 *
 * Extracted from `api-v1-health/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { getAllCircuitStatuses } from "../../_shared/circuit-breaker.ts";
import { AppError } from "../../_shared/errors.ts";
import { getErrorStats } from "../../_shared/error-tracking.ts";
import {
  FunctionHealthResult,
  getHealthService,
  HEALTH_VERSION,
} from "../../_shared/health/index.ts";
import { getHealthMetrics } from "../../_shared/performance.ts";
import { parseRoute } from "../../_shared/routing.ts";
import { SERVICE } from "./config.ts";
import { handleMetrics } from "./metrics.ts";

export async function handleGet(ctx: HandlerContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const route = parseRoute(url, ctx.request.method, SERVICE);
  const service = getHealthService();

  // GET /metrics -- observability data (from health-advanced)
  if (route.resource === "metrics") {
    return await handleMetrics(ctx);
  }

  // GET /full or GET /?full=true -- full health + observability merged
  const isFull = route.resource === "full" ||
    url.searchParams.get("full") === "true";

  if (isFull) {
    const [fullHealth, metricsResponse] = await Promise.all([
      service.checkFullHealth(),
      (async () => {
        const healthMetrics = getHealthMetrics();
        const errorStats = getErrorStats();
        const circuitBreakers = getAllCircuitStatuses();
        return { healthMetrics, errorStats, circuitBreakers };
      })(),
    ]);

    const httpStatus = fullHealth.status === "unhealthy" ? 503 : 200;

    return ok(
      {
        ...fullHealth,
        system: {
          uptime: metricsResponse.healthMetrics.uptime,
          memory: metricsResponse.healthMetrics.memory,
        },
        performance: {
          recentMetrics: metricsResponse.healthMetrics.recentMetrics,
          slowQueries: metricsResponse.healthMetrics.slowQueries,
        },
        errors: {
          total: metricsResponse.errorStats.total,
          bySeverity: metricsResponse.errorStats.bySeverity,
          topErrors: metricsResponse.errorStats.topErrors.slice(0, 5),
        },
        circuitBreakersDetailed: Object.entries(metricsResponse.circuitBreakers)
          .map((
            [name, cb],
          ) => ({
            name,
            state: cb.state,
            failures: cb.failures,
            totalRequests: cb.totalRequests,
            totalFailures: cb.totalFailures,
          })),
      },
      ctx,
      { status: httpStatus },
    );
  }

  // GET / -- quick health (DB ping)
  // Always returns 200: this is a liveness check, not a DB readiness gate.
  // Use GET /?full=true for deep health including DB.
  const result = await service.checkQuickHealth();
  return ok(result, ctx, { status: 200, cacheTTL: 10 });
}

export async function handlePost(ctx: HandlerContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const route = parseRoute(url, ctx.request.method, SERVICE);
  const service = getHealthService();

  // POST /functions/:name -- check single function
  if (route.resource === "functions" && route.subPath) {
    const functionName = route.subPath;
    const result = await service.checkSingleFunction(functionName);

    if ("error" in result && !("status" in result)) {
      throw new AppError(
        (result as { error: string }).error || "Function not found",
        "NOT_FOUND",
        404,
      );
    }

    const healthResult = result as FunctionHealthResult;
    const httpStatus = healthResult.status === "healthy"
      ? 200
      : healthResult.status === "degraded"
      ? 200
      : 503;
    return ok(result, ctx, { status: httpStatus });
  }

  // POST /functions -- check all functions
  if (route.resource === "functions" || route.segments.length === 0) {
    const quick = url.searchParams.get("quick") === "true";
    const result = await service.checkAllFunctions(quick);
    const httpStatus = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
    return ok(result, ctx, { status: httpStatus });
  }

  // 404
  throw new AppError("Not found", "NOT_FOUND", 404, {
    details: {
      version: HEALTH_VERSION,
      availableEndpoints: [
        "GET  /                   Quick health (DB ping)",
        "GET  /?full=true         Full health + observability",
        "GET  /full               Alias for /?full=true",
        "GET  /metrics            System metrics & observability",
        "POST /functions          Check all edge functions",
        "POST /functions?quick=true  Quick fleet check",
        "POST /functions/:name    Check single edge function",
      ],
    },
  });
}
