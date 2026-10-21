/**
 * Metrics Route Dispatch
 *
 * Extracted from `api-v1-metrics/index.ts` — no logic changes.
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ServerError } from "../../../_shared/errors.ts";
import type { createHealthHandler } from "../../../_shared/health-handler.ts";
import type { BatchEventsRequest, EventRequest, MetricsQuery } from "../schemas.ts";
import { handleGetMetrics } from "./get-metrics.ts";
import { handleTrackBatchEvents, handleTrackEvent } from "./track-events.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  function handleGet(
    ctx: HandlerContext<unknown, MetricsQuery>,
  ): Promise<Response> {
    return handleGetMetrics(ctx, healthCheck);
  }

  async function handlePost(
    ctx: HandlerContext<EventRequest | BatchEventsRequest>,
  ): Promise<Response> {
    const url = new URL(ctx.request.url);
    const path = url.pathname;

    if (path.endsWith("/events")) {
      return handleTrackBatchEvents(ctx as HandlerContext<BatchEventsRequest>);
    } else if (path.endsWith("/event")) {
      return handleTrackEvent(ctx as HandlerContext<EventRequest>);
    }

    throw new ServerError("Invalid endpoint");
  }

  return { handleGet, handlePost };
}
