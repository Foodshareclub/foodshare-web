/**
 * Compatibility Check Handler (GET /compatibility)
 *
 * Platform/version support matrix via `check_client_compatibility` RPC.
 * Extracted from `api-v1-feature-flags/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ServerError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import type { FlagsQuery } from "../schemas.ts";

export async function handleCompatibilityCheck(
  ctx: HandlerContext<unknown, FlagsQuery>,
): Promise<Response> {
  const { supabase, query, request, ctx: requestCtx } = ctx;

  const platform = request.headers.get("X-Platform") || query.platform ||
    "unknown";
  const version = request.headers.get("X-App-Version") || query.version ||
    "1.0.0";

  logger.info("Checking client compatibility", {
    platform,
    version,
    requestId: requestCtx?.requestId,
  });

  const { data, error } = await supabase.rpc("check_client_compatibility", {
    p_platform: platform,
    p_version: version,
  });

  if (error) {
    logger.error("Failed to check compatibility", {
      error: error.message,
      requestId: requestCtx?.requestId,
    });
    throw new ServerError("Failed to check compatibility");
  }

  const dbResponse = data as {
    success: boolean;
    supported: boolean;
    needsUpdate: boolean;
    forceUpdate: boolean;
    currentVersion: string;
    minVersion: string;
    recommendedVersion: string;
    message: string | null;
  };

  return ok(
    {
      supported: dbResponse.supported,
      needsUpdate: dbResponse.needsUpdate,
      forceUpdate: dbResponse.forceUpdate,
      versions: {
        current: dbResponse.currentVersion,
        minimum: dbResponse.minVersion,
        recommended: dbResponse.recommendedVersion,
      },
      message: dbResponse.message,
      action: dbResponse.forceUpdate
        ? "force_update"
        : dbResponse.needsUpdate
        ? "suggest_update"
        : "none",
    },
    ctx,
  );
}
