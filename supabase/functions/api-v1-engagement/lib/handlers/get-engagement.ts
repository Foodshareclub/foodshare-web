/**
 * Engagement Read Handlers (GET)
 *
 * Single/batch engagement status + user bookmarks.
 * Extracted from `api-v1-engagement/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { cache, CACHE_KEYS, CACHE_TTLS } from "../../../_shared/cache.ts";
import type { QueryParams } from "../schemas.ts";

/**
 * Get engagement status for a post or batch of posts
 */
export async function getEngagement(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId, query } = ctx;

  // Batch request
  if (query.postIds) {
    const postIds = query.postIds.split(",").map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (postIds.length === 0 || postIds.length > 100) {
      throw new ValidationError("Invalid postIds (1-100 required)");
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.engagement(postIds, userId);
    const cached = cache.get<
      Record<
        number,
        { isLiked: boolean; isBookmarked: boolean; likeCount: number }
      >
    >(cacheKey);
    if (cached) {
      return ok(cached, ctx);
    }

    // Single RPC call replaces 3 separate queries
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "get_batch_engagement",
      {
        p_post_ids: postIds,
        p_user_id: userId || null,
      },
    );

    if (!rpcError && rpcResult) {
      // RPC returns JSONB with string keys — normalize to number keys
      const result: Record<
        number,
        { isLiked: boolean; isBookmarked: boolean; likeCount: number }
      > = {};
      for (const postId of postIds) {
        const entry = rpcResult[String(postId)];
        result[postId] = entry ||
          { isLiked: false, isBookmarked: false, likeCount: 0 };
      }
      cache.set(cacheKey, result, CACHE_TTLS.engagement);
      return ok(result, ctx);
    }

    // Fallback to individual queries if RPC fails
    logger.warn("Batch engagement RPC failed, falling back", {
      error: rpcError?.message,
    });

    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    const likeCountMap: Record<number, number> = {};
    for (const like of likes || []) {
      likeCountMap[like.post_id] = (likeCountMap[like.post_id] || 0) + 1;
    }

    let userLikes: number[] = [];
    let userBookmarks: number[] = [];

    if (userId) {
      const [likesResult, bookmarksResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("profile_id", userId)
          .in("post_id", postIds),
        supabase
          // `bookmarks`, not `post_bookmarks`: there is no post_bookmarks
          // relation. The table carries both post and forum bookmarks and
          // defaults forum rows to post_id = 0, so a `post_id IN (...)`
          // filter cannot pick them up.
          .from("bookmarks")
          .select("post_id")
          .eq("profile_id", userId)
          .in("post_id", postIds),
      ]);

      userLikes = (likesResult.data || []).map((l) => l.post_id);
      userBookmarks = (bookmarksResult.data || []).map((b) => b.post_id);
    }

    const result: Record<
      number,
      { isLiked: boolean; isBookmarked: boolean; likeCount: number }
    > = {};
    for (const postId of postIds) {
      result[postId] = {
        isLiked: userLikes.includes(postId),
        isBookmarked: userBookmarks.includes(postId),
        likeCount: likeCountMap[postId] || 0,
      };
    }

    cache.set(cacheKey, result, CACHE_TTLS.engagement);
    return ok(result, ctx);
  }

  // Single post request
  if (query.postId) {
    const postId = parseInt(query.postId);
    if (isNaN(postId)) {
      throw new ValidationError("Invalid postId");
    }

    const { count: likeCount } = await supabase
      .from("post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      const [likeResult, bookmarkResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("profile_id", userId)
          .single(),
        supabase
          // `bookmarks`, not `post_bookmarks`: there is no post_bookmarks
          // relation. The table carries both post and forum bookmarks and
          // defaults forum rows to post_id = 0, so a `post_id IN (...)`
          // filter cannot pick them up.
          .from("bookmarks")
          .select("id")
          .eq("post_id", postId)
          .eq("profile_id", userId)
          .single(),
      ]);

      isLiked = !!likeResult.data;
      isBookmarked = !!bookmarkResult.data;
    }

    return ok({
      postId,
      isLiked,
      isBookmarked,
      likeCount: likeCount || 0,
    }, ctx);
  }

  throw new ValidationError("postId or postIds required");
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

  const limit = Math.min(parseInt(query.limit || "50"), 100);

  const { data, error } = await supabase
    .from("bookmarks")
    .select("post_id,created_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to get bookmarks", new Error(error.message));
    throw error;
  }

  return ok({
    postIds: (data || []).map((b) => b.post_id),
    count: data?.length || 0,
  }, ctx);
}
