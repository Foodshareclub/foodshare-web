/**
 * Feature Flags Route Dispatch
 *
 * Extracted from `api-v1-feature-flags/index.ts` — no logic changes.
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import type { createHealthHandler } from "../../../_shared/health-handler.ts";
import { getSubPath } from "../path.ts";
import type { FlagsQuery } from "../schemas.ts";
import { handleCompatibilityCheck } from "./compatibility.ts";
import { handleExperimentVariant } from "./experiments.ts";
import { handleGetFeatureFlags } from "./flags.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  async function handleGet(
    ctx: HandlerContext<unknown, FlagsQuery>,
  ): Promise<Response> {
    const { request, query } = ctx;
    const url = new URL(request.url);
    const subPath = getSubPath(url);

    // GET /health
    if (subPath === "health" || subPath === "health/") {
      return healthCheck(ctx);
    }

    // GET /compatibility
    if (
      subPath === "compatibility" || subPath === "compatibility/" ||
      query.action === "compatibility"
    ) {
      return handleCompatibilityCheck(ctx);
    }

    // GET /experiments/:key or ?experimentKey=...
    if (subPath.startsWith("experiments") || query.experimentKey) {
      const experimentKey = query.experimentKey || subPath.split("/").pop() || "";
      if (experimentKey && experimentKey !== "experiments") {
        return handleExperimentVariant(ctx, experimentKey);
      }
    }

    // GET / — all flags
    return handleGetFeatureFlags(ctx);
  }

  return { handleGet };
}
