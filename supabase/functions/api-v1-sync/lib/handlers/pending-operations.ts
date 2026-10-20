/**
 * Pending Operations Handler (POST /sync/pending)
 *
 * Submit → conflict-check → apply pipeline per offline operation.
 * Extracted from `api-v1-sync/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import type { PendingOperationsRequest } from "../schemas.ts";

export async function handlePendingOperations(
  ctx: HandlerContext<PendingOperationsRequest>,
): Promise<Response> {
  const { supabase, userId, body, ctx: requestCtx } = ctx;

  logger.info("Processing pending operations", {
    userId: userId?.substring(0, 8),
    operationCount: body.operations.length,
    requestId: requestCtx?.requestId,
  });

  if (!body.operations || body.operations.length === 0) {
    return ok({ processed: 0, results: [] }, ctx);
  }

  const results: Array<{
    operationId: string;
    status: "applied" | "conflict" | "rejected" | "pending";
    error?: string;
    serverVersion?: unknown;
    serverTimestamp?: string;
  }> = [];

  for (const op of body.operations) {
    try {
      // Step 1: Submit operation for conflict detection
      const { data: submitData, error: submitError } = await supabase.rpc(
        "submit_pending_operation",
        {
          p_user_id: userId,
          p_operation_type: op.operation,
          p_table_name: op.table,
          p_record_id: op.recordId || null,
          p_payload: op.data || {},
          p_client_timestamp: op.clientTimestamp,
        },
      );

      if (submitError) {
        results.push({
          operationId: op.operationId,
          status: "rejected",
          error: submitError.message,
        });
        continue;
      }

      const submitResult = submitData as {
        success: boolean;
        operationId: string;
        conflict?: boolean;
        serverTimestamp?: string;
        status?: string;
        message?: string;
      };

      // If conflict detected, don't apply
      if (submitResult.conflict) {
        results.push({
          operationId: op.operationId,
          status: "conflict",
          serverTimestamp: submitResult.serverTimestamp,
        });
        continue;
      }

      // Step 2: Apply the pending operation
      const { data: applyData, error: applyError } = await supabase.rpc(
        "apply_pending_operation",
        {
          p_operation_id: submitResult.operationId,
        },
      );

      if (applyError) {
        results.push({
          operationId: op.operationId,
          status: "rejected",
          error: applyError.message,
        });
        continue;
      }

      const applyResult = applyData as {
        success: boolean;
        status: "applied" | "conflict" | "rejected";
        error?: string;
      };

      results.push({
        operationId: op.operationId,
        status: applyResult.success ? "applied" : (applyResult.status || "rejected"),
        error: applyResult.error,
      });
    } catch (opError) {
      results.push({
        operationId: op.operationId,
        status: "rejected",
        error: opError instanceof Error ? opError.message : "Unknown error",
      });
    }
  }

  const applied = results.filter((r) => r.status === "applied").length;
  const conflicts = results.filter((r) => r.status === "conflict").length;
  const rejected = results.filter((r) => r.status === "rejected").length;

  logger.info("Pending operations processed", {
    userId: userId?.substring(0, 8),
    applied,
    conflicts,
    rejected,
    requestId: requestCtx?.requestId,
  });

  return ok({
    processed: results.length,
    summary: { applied, conflicts, rejected },
    results,
  }, ctx);
}
