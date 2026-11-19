/**
 * Engagement Share Handler
 *
 * Anonymous-capable share recording.
 * Extracted from `api-v1-engagement/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import { logActivity } from "../activity.ts";
import type { ShareBody } from "../schemas.ts";

/**
 * Record a share
 */
export async function recordShare(ctx: HandlerContext<ShareBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  // Log activity (shares can be anonymous)
  await logActivity(supabase, body.postId, userId || null, "shared", {
    method: body.method,
  });

  logger.info("Share recorded", { postId: body.postId, method: body.method });

  return ok({ success: true }, ctx);
}
