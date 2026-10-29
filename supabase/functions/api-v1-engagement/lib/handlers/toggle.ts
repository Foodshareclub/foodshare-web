/**
 * Engagement Toggle Handlers (like / bookmark / favorite)
 *
 * Like and bookmark mutations share the consolidated-table atomic RPC.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { togglePostEngagement } from "../../../_shared/post-engagement.ts";
import { logActivity } from "../activity.ts";
import type { QueryParams, ToggleBody } from "../schemas.ts";

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

/**
 * Toggle favorite (atomic operation)
 */
export async function toggleFavorite(
  ctx: HandlerContext<ToggleBody, QueryParams>,
): Promise<Response> {
  const { supabase, userId, body, query } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const mode = query.mode || "toggle";

  logger.info("Favorite operation", { mode, postId: body.postId, userId });

  let isFavorited: boolean;
  let action: "added" | "removed" | "unchanged";

  if (mode === "toggle") {
    // Use RPC for atomic toggle
    const { data, error } = await supabase.rpc("toggle_post_favorite_atomic", {
      p_user_id: userId,
      p_post_id: body.postId,
    });

    if (error) {
      logger.error("Toggle favorite failed", {
        error,
        postId: body.postId,
        userId,
      });
      throw new ValidationError(`Failed to toggle favorite: ${error.message}`);
    }

    isFavorited = data.is_favorited;
    action = data.was_added ? "added" : "removed";
  } else if (mode === "add") {
    // Add favorite (upsert)
    const { error } = await supabase
      .from("favorites")
      .upsert(
        { user_id: userId, post_id: body.postId },
        { onConflict: "user_id,post_id", ignoreDuplicates: true },
      );

    if (error) {
      logger.error("Add favorite failed", {
        error,
        postId: body.postId,
        userId,
      });
      throw new ValidationError(`Failed to add favorite: ${error.message}`);
    }

    isFavorited = true;
    action = "added";
  } else {
    // Remove favorite
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", body.postId);

    if (error) {
      logger.error("Remove favorite failed", {
        error,
        postId: body.postId,
        userId,
      });
      throw new ValidationError(`Failed to remove favorite: ${error.message}`);
    }

    isFavorited = false;
    action = "removed";
  }

  // Get updated like count
  const { data: post } = await supabase
    .from("posts")
    .select("post_like_counter")
    .eq("id", body.postId)
    .single();

  logger.info("Favorite operation completed", {
    mode,
    postId: body.postId,
    action,
    isFavorited,
  });

  return ok(
    {
      postId: body.postId,
      isFavorited,
      likeCount: post?.post_like_counter ?? 0,
      action,
    },
    ctx,
  );
}
