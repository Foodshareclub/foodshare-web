/**
 * Sync Status Handler (GET /sync/status)
 *
 * Checkpoints + pending-operation count for offline-first clients.
 * Extracted from `api-v1-sync/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ServerError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";

export async function handleSyncStatus(ctx: HandlerContext): Promise<Response> {
  const { supabase, userId, ctx: requestCtx } = ctx;

  logger.info("Getting sync status", {
    userId: userId?.substring(0, 8),
    requestId: requestCtx?.requestId,
  });

  // Get sync checkpoints for user
  const { data: checkpoints, error: checkpointError } = await supabase
    .from("sync_checkpoints")
    .select("table_name,last_sync_version,last_sync_at")
    .eq("user_id", userId);

  if (checkpointError) {
    logger.error("Failed to get sync status", {
      error: checkpointError.message,
      requestId: requestCtx?.requestId,
    });
    throw new ServerError("Failed to retrieve sync status");
  }

  // Get pending operations count
  const { count: pendingCount } = await supabase
    .from("pending_operations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  const checkpointMap: Record<string, { version: number; syncedAt: string }> = {};
  for (const cp of checkpoints || []) {
    checkpointMap[cp.table_name] = {
      version: cp.last_sync_version,
      syncedAt: cp.last_sync_at,
    };
  }

  return ok({
    checkpoints: checkpointMap,
    pendingOperations: pendingCount || 0,
    lastSyncAt: checkpoints && checkpoints.length > 0
      ? checkpoints.reduce(
        (latest, cp) => new Date(cp.last_sync_at) > new Date(latest) ? cp.last_sync_at : latest,
        checkpoints[0].last_sync_at,
      )
      : null,
  }, ctx);
}
