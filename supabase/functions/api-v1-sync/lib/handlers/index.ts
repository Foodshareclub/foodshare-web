/**
 * Sync Route Dispatch (GET/POST router)
 *
 * Extracted from `api-v1-sync/index.ts` — no logic changes.
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import type { createHealthHandler } from "../../../_shared/health-handler.ts";
import { getSubPath } from "../path.ts";
import { pendingOperationsSchema, syncRequestSchema } from "../schemas.ts";
import { handleDeltaSync } from "./delta-sync.ts";
import { handlePendingOperations } from "./pending-operations.ts";
import { handleSyncStatus } from "./sync-status.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  async function handlePostSync(ctx: HandlerContext): Promise<Response> {
    const { request } = ctx;
    const url = new URL(request.url);
    const subPath = getSubPath(url);

    // POST /sync/pending
    if (subPath === "pending" || subPath === "pending/") {
      const parsed = pendingOperationsSchema.safeParse(ctx.body);

      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.errors.map((e) => e.message).join(", "),
        );
      }

      return handlePendingOperations({ ...ctx, body: parsed.data });
    }

    // POST /sync - Delta sync
    const parsed = syncRequestSchema.safeParse(ctx.body);

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }

    return handleDeltaSync({ ...ctx, body: parsed.data });
  }

  async function handleGetSync(ctx: HandlerContext): Promise<Response> {
    const { request } = ctx;
    const url = new URL(request.url);
    const subPath = getSubPath(url);

    // Health check
    if (subPath === "health" || subPath === "health/") {
      return healthCheck(ctx);
    }

    // GET /sync/status
    if (subPath === "status" || subPath === "status/") {
      return handleSyncStatus(ctx);
    }

    // GET /sync - Not supported, return method info
    throw new ValidationError(
      "Use POST /sync for delta sync or GET /sync/status for sync status",
    );
  }

  return { handlePostSync, handleGetSync };
}
