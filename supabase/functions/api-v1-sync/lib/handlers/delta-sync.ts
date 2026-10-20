/**
 * Delta Sync Handler (POST /sync)
 *
 * Version-based incremental fetch via the `get_delta_sync` RPC.
 * Extracted from `api-v1-sync/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ServerError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import type { SyncRequest } from "../schemas.ts";

export async function handleDeltaSync(
  ctx: HandlerContext<SyncRequest>,
): Promise<Response> {
  const { supabase, userId, body, ctx: requestCtx } = ctx;
  const startTime = performance.now();

  logger.info("Processing delta sync", {
    userId: userId?.substring(0, 8),
    tables: body.tables,
    requestId: requestCtx?.requestId,
  });

  // Call the database function for delta sync.
  //
  // `p_checkpoints` is deliberately not passed: the function takes
  // `(p_user_id, p_tables)` and no overload accepts a checkpoints argument,
  // so passing it made PostgREST reject every call with "function does not
  // exist" and delta sync failed outright.
  const { data, error } = await supabase.rpc("get_delta_sync", {
    p_user_id: userId,
    p_tables: body.tables,
  });

  if (error) {
    logger.error("Delta sync failed", {
      error: error.message,
      requestId: requestCtx?.requestId,
    });
    throw new ServerError("Failed to retrieve sync data");
  }

  const dbResponse = data as {
    success: boolean;
    tables: Record<string, {
      changes: unknown[];
      checkpoint: number;
      hasMore: boolean;
    }>;
    meta: {
      totalChanges: number;
      syncedAt: string;
    };
  };

  const processingTime = Math.round(performance.now() - startTime);

  logger.info("Delta sync completed", {
    userId: userId?.substring(0, 8),
    totalChanges: dbResponse.meta?.totalChanges || 0,
    processingTime,
    requestId: requestCtx?.requestId,
  });

  return ok(
    {
      tables: dbResponse.tables,
      syncedAt: dbResponse.meta?.syncedAt || new Date().toISOString(),
      totalChanges: dbResponse.meta?.totalChanges || 0,
    },
    ctx,
    {
      uiHints: {
        refreshAfter: 30, // Suggest re-sync in 30 seconds
      },
    },
  );
}
