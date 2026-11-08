/**
 * Engagement Toggle Handlers (like / bookmark)
 *
 * Like and bookmark mutations share the consolidated-table atomic RPC.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { togglePostEngagement } from "../../../_shared/post-engagement.ts";
import { logActivity } from "../activity.ts";
import type { ToggleBody } from "../schemas.ts";

/**
 * Toggle like on a post
 */
export async function toggleLike(ctx: HandlerContext<ToggleBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const result = await togglePostEngagement(supabase, "like", body.postId, userId);

  const isLiked = result.active;
  await logActivity(supabase, body.postId, userId, isLiked ? "liked" : "unliked");

  logger.info("Like toggled", { postId: body.postId, userId, isLiked });

  return ok(
    {
      postId: body.postId,
      isLiked,
      likeCount: result.likeCount,
    },
    ctx,
  );
}

/**
 * Toggle bookmark on a post
 */
export async function toggleBookmark(ctx: HandlerContext<ToggleBody>): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const result = await togglePostEngagement(supabase, "bookmark", body.postId, userId);

  const isBookmarked = result.active;
  await logActivity(supabase, body.postId, userId, isBookmarked ? "bookmarked" : "unbookmarked");

  logger.info("Bookmark toggled", {
    postId: body.postId,
    userId,
    isBookmarked,
  });

  return ok(
    {
      postId: body.postId,
      isBookmarked,
    },
    ctx,
  );
}
