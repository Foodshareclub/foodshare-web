/**
 * Reviews Write Handler (POST)
 *
 * Submit with self-review guard, duplicate detection, rating rollup,
 * and cache invalidation.
 * Extracted from `api-v1-reviews/index.ts` — no logic changes.
 */

import { created, type HandlerContext } from "../../../_shared/api-handler.ts";
import { ConflictError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { ERROR_MESSAGES } from "../../../_shared/validation-rules.ts";
import { cache, CACHE_KEYS } from "../../../_shared/cache.ts";
import type { SubmitReviewBody } from "../schemas.ts";
import { transformReview } from "../transformers.ts";

/**
 * Submit a review
 */
export async function submitReview(
  ctx: HandlerContext<SubmitReviewBody>,
): Promise<Response> {
  const { supabase, userId, body } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  // Prevent self-review
  if (body.revieweeId === userId) {
    throw new ValidationError(ERROR_MESSAGES.cannotReviewSelf);
  }

  // Check for existing review (unique constraint: reviewer + post)
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("profile_id", userId)
    .eq("post_id", body.postId)
    .single();

  if (existing) {
    throw new ConflictError(ERROR_MESSAGES.alreadyReviewed);
  }

  // Insert review (profile_id = reviewer, RLS enforces profile_id = auth.uid())
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      profile_id: userId,
      post_id: body.postId,
      reviewed_rating: body.rating,
      feedback: body.feedback || "",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ConflictError("You have already reviewed this exchange");
    }
    logger.error("Failed to submit review", { error: error.message });
    throw new Error(error.message);
  }

  // The reviewee's rating is *not* denormalised onto `profiles` here.
  //
  // This used to read every `reviewed_rating` for the reviewee, average them in
  // Node, and write the result to `profiles.rating_count` and
  // `profiles.rating_average`. Neither column exists and never did, so the
  // UPDATE was rejected by PostgREST and the error was not read — the block did
  // nothing except make a full table read per review submission. It was also
  // wrong on its own terms: `aggregateRating` has to describe every review, and
  // Google treats a rating that quietly excludes the worst ones as a
  // manual-action risk.
  //
  // `20261008000000_post_rating_aggregate.sql` replaces it with
  // `get_post_rating`, which computes the true mean and the population size in
  // the database over every *rated* review, and which the JSON-LD path reads.
  // The comment the old block carried — "ideally handled by database trigger" —
  // described a trigger that was never written.

  // Invalidate review cache for the reviewee
  cache.delete(CACHE_KEYS.reviews(body.revieweeId, 20));
  cache.delete(CACHE_KEYS.reviews(body.revieweeId, 50));

  logger.info("Review submitted", {
    reviewId: data.id,
    reviewerId: userId,
    revieweeId: body.revieweeId,
    postId: body.postId,
    rating: body.rating,
  });

  return created(transformReview(data), ctx);
}
