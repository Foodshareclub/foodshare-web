/**
 * Feature Flags Handler (GET /)
 *
 * User/global flag resolution via `get_user_feature_flags` RPC with
 * 5-minute cache.
 * Extracted from `api-v1-feature-flags/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ServerError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { cache, CACHE_KEYS, CACHE_TTLS } from "../../../_shared/cache.ts";
import type { FlagsQuery } from "../schemas.ts";

export async function handleGetFeatureFlags(
  ctx: HandlerContext<unknown, FlagsQuery>,
): Promise<Response> {
  const { supabase, userId, query, request, ctx: requestCtx } = ctx;

  const platform = request.headers.get("X-Platform") || query.platform ||
    "unknown";
  const appVersion = request.headers.get("X-App-Version") || query.version ||
    null;

  logger.info("Getting feature flags", {
    userId: userId?.substring(0, 8),
    platform,
    requestId: requestCtx?.requestId,
  });

  // Cache key: user-specific or global
  const cacheKey = userId ? CACHE_KEYS.userFeatureFlags(userId) : CACHE_KEYS.featureFlags();

  const cached = cache.get<{
    flags: Record<
      string,
      { enabled: boolean; config: Record<string, unknown> }
    >;
    context: { platform: string; appVersion: string; userHash: number };
    meta: { timestamp: string; refreshAfter: number; cacheTTL: number };
  }>(cacheKey);

  if (cached) {
    logger.debug("Feature flags cache hit", { cacheKey });
    return ok(
      { flags: cached.flags, context: cached.context },
      ctx,
      {
        cacheTTL: cached.meta?.cacheTTL || 60,
        uiHints: { refreshAfter: cached.meta?.refreshAfter || 300 },
      },
    );
  }

  const { data, error } = await supabase.rpc("get_user_feature_flags", {
    p_user_id: userId || null,
    p_platform: platform,
    p_app_version: appVersion,
  });

  if (error) {
    logger.error("Failed to get feature flags", {
      error: error.message,
      requestId: requestCtx?.requestId,
    });
    throw new ServerError("Failed to retrieve feature flags");
  }

  const dbResponse = data as {
    success: boolean;
    flags: Record<
      string,
      { enabled: boolean; config: Record<string, unknown> }
    >;
    context: { platform: string; appVersion: string; userHash: number };
    meta: { timestamp: string; refreshAfter: number; cacheTTL: number };
  };

  // Cache the response for 5 minutes
  cache.set(cacheKey, dbResponse, CACHE_TTLS.featureFlags);

  return ok(
    {
      flags: dbResponse.flags,
      context: dbResponse.context,
    },
    ctx,
    {
      cacheTTL: dbResponse.meta?.cacheTTL || 60,
      uiHints: {
        refreshAfter: dbResponse.meta?.refreshAfter || 300,
      },
    },
  );
}
