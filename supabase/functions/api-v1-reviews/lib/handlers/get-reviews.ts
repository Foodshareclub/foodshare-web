/**
 * Reviews Read Handler (GET)
 *
 * Cached user/post review listing with cursor pagination.
 * Extracted from `api-v1-reviews/index.ts` — no logic changes.
 */

import { type HandlerContext, ok, paginated } from "../../../_shared/api-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import { cache, CACHE_KEYS, CACHE_TTLS } from "../../../_shared/cache.ts";
import type { QueryParams } from "../schemas.ts";
import { transformReview } from "../transformers.ts";

/**
 * Get reviews for a user or post
 */
export async function getReviews(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  const { supabase, userId: authUserId, query } = ctx;

  // When userId is supplied from query, only use it if the authenticated
  // user is authorized to view another user's reviews. If no user is
  // authenticated, ignore the query userId (it could be spoofed).
  const effectiveUserId = query.userId && authUserId && query.userId === authUserId
    ? query.userId
    : authUserId;

  const limit = Math.min(parseInt(query.limit || "20"), 50);
  const cursor = query.cursor;

  // Check cache for user review queries (most common pattern)
  if (effectiveUserId && !cursor) {
    const cacheKey = CACHE_KEYS.reviews(effectiveUserId, limit);
    const cached = cache.get(cacheKey);
    if (cached) {
      return ok(cached, ctx);
    }
  }

  let dbQuery = supabase
    .from("reviews")
    .select(
      `
      id,
      profile_id,
      post_id,
      reviewed_rating,
      feedback,
      created_at
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (effectiveUserId) {
    dbQuery = dbQuery.eq("profile_id", effectiveUserId);
  }

  if (query.postId) {
    dbQuery = dbQuery.eq("post_id", parseInt(query.postId));
  }

  if (cursor) {
    dbQuery = dbQuery.lt("created_at", cursor);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    logger.error("Failed to get reviews", { error: error.message });
    throw new Error(error.message);
  }

  const items = data || [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;

  // Cache user review results (first page only, no cursor)
  if (effectiveUserId && !cursor) {
    const cacheKey = CACHE_KEYS.reviews(effectiveUserId, limit);
    cache.set(cacheKey, {
      items: resultItems.map(transformReview),
      total: count || resultItems.length,
    }, CACHE_TTLS.reviews);
  }

  return paginated(
    resultItems.map(transformReview),
    ctx,
    {
      offset: 0,
      limit,
      total: count || resultItems.length,
    },
  );
}
