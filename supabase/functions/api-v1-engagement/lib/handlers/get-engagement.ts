/** Fresh engagement reads share the same consolidated-table RPC as batch clients. */
import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { DatabaseError, ValidationError } from "../../../_shared/errors.ts";
import { postEngagementId } from "../../../_shared/post-engagement.ts";
import { logger } from "../../../_shared/logger.ts";
import type { QueryParams } from "../schemas.ts";

export async function getEngagement(ctx: HandlerContext<unknown, QueryParams>): Promise<Response> {
  const { supabase, userId, query } = ctx;
  const batch = query.postIds !== undefined;
  if (!batch && query.postId === undefined) throw new ValidationError("postId or postIds required");
  const ids = batch ? query.postIds!.split(",") : [query.postId!];
  if (ids.length < 1 || ids.length > 100) {
    throw new ValidationError("Invalid postIds (1-100 required)");
  }
  const postIds = [...new Set(ids.map(postEngagementId))];
  const { data, error } = await supabase.rpc("get_batch_engagement", {
    p_post_ids: postIds,
    p_user_id: userId ?? null,
  });
  if (error) {
    logger.error("Post engagement read failed", { code: error.code });
    throw new DatabaseError("Unable to load engagement");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new DatabaseError("Invalid engagement response");
  }
  const result: Record<number, { isLiked: boolean; isBookmarked: boolean; likeCount: number }> = {};
  for (const id of postIds) {
    const entry = data[String(id)];
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof entry.isLiked !== "boolean" ||
      typeof entry.isBookmarked !== "boolean" ||
      typeof entry.likeCount !== "number" ||
      !Number.isSafeInteger(entry.likeCount) ||
      entry.likeCount < 0
    ) {
      throw new DatabaseError("Invalid engagement response");
    }
    result[id] = {
      isLiked: entry.isLiked,
      isBookmarked: entry.isBookmarked,
      likeCount: entry.likeCount,
    };
  }
  // These values change on writes across workers. Do not serve a process-local
  // cached value immediately after another worker has committed a toggle.
  const response = ok(batch ? result : { postId: postIds[0], ...result[postIds[0]] }, ctx);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Get user's bookmarked posts
 */
export async function getUserBookmarks(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId, query } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const limit = Math.min(postEngagementId(query.limit ?? 50), 100);

  const { data, error } = await supabase
    .from("bookmarks")
    .select("post_id,created_at")
    .eq("profile_id", userId)
    .gt("post_id", 0)
    .eq("forum_id", 0)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to get bookmarks", new Error(error.message));
    throw new DatabaseError("Unable to load bookmarks");
  }

  const response = ok(
    {
      postIds: (data || []).map((b) => b.post_id),
      count: data?.length || 0,
    },
    ctx,
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
