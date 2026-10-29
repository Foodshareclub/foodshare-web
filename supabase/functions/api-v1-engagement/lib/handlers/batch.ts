/**
 * Engagement Batch Operations Handler
 *
 * Correlated multi-op execution with per-op success/failure.
 * Post toggles share the same atomic path as single-operation requests.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ServerError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { postEngagementId, togglePostEngagement } from "../../../_shared/post-engagement.ts";
import type { BatchOperationsBody, QueryParams } from "../schemas.ts";

export async function handleBatchOperations(
  ctx: HandlerContext<BatchOperationsBody, QueryParams>,
): Promise<Response> {
  const { operations } = ctx.body;
  const { userId, supabase } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  logger.info("Processing batch operations", {
    count: operations.length,
    userId: userId.substring(0, 8),
    types: [...new Set(operations.map((op) => op.type))],
  });

  const results = await Promise.all(
    operations.map(async (operation) => {
      try {
        let data: unknown;
        const entityId = operation.entityId;

        switch (operation.type) {
          case "toggle_favorite": {
            const { data: result, error } = await supabase.rpc("toggle_post_favorite_atomic", {
              p_user_id: userId,
              p_post_id: postEngagementId(entityId),
            });
            if (error) throw new ServerError(error.message);
            data = {
              isFavorited: result.is_favorited,
              likeCount: result.like_count,
            };
            break;
          }
          case "toggle_like": {
            const likeResult = await togglePostEngagement(supabase, "like", entityId, userId);
            data = { isLiked: likeResult.active };
            break;
          }
          case "toggle_bookmark": {
            const bookmarkResult = await togglePostEngagement(
              supabase,
              "bookmark",
              entityId,
              userId,
            );
            data = { isBookmarked: bookmarkResult.active };
            break;
          }
          case "mark_read": {
            // The function takes the room id as `conversation_uuid` and
            // reads the user from `auth.uid()` internally, so `p_room_id`
            // and `p_user_id` match no overload and PostgREST rejects the
            // call — every mark-as-read failed with "function does not
            // exist". The room id *is* the conversation uuid.
            const { error } = await supabase.rpc("mark_messages_read", {
              conversation_uuid: operation.entityId,
            });
            if (error) throw new ServerError(error.message);
            data = { markedRead: true };
            break;
          }
          case "archive_room": {
            const { error } = await supabase
              .from("room_members")
              .update({ is_archived: true })
              .eq("room_id", operation.entityId)
              .eq("profile_id", userId);
            if (error) throw new ServerError(error.message);
            data = { archived: true };
            break;
          }
        }

        return { correlationId: operation.correlationId, success: true, data };
      } catch (error) {
        return {
          correlationId: operation.correlationId,
          success: false,
          error: (error as Error).message,
        };
      }
    }),
  );

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return ok(
    {
      totalOperations: operations.length,
      successful,
      failed,
      results,
    },
    ctx,
  );
}
