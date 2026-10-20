/**
 * Engagement Activity Logger
 *
 * Best-effort `post_activity_logs` writes — never fail the main operation.
 * Extracted from `api-v1-engagement/index.ts` — no logic changes.
 */

import { logger } from "../../_shared/logger.ts";

export async function logActivity(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  postId: number,
  actorId: string | null,
  activityType: string,
  metadata?: Record<string, unknown>,
) {
  try {
    // @ts-ignore - supabase client type
    await supabase.from("post_activity_logs").insert({
      post_id: postId,
      actor_id: actorId,
      activity_type: activityType,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Don't fail the main operation if activity logging fails
    logger.warn("Failed to log activity", { postId, activityType, error: err });
  }
}
