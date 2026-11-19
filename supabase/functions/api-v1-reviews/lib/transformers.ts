/**
 * Review Transformers
 *
 * DB row → API shape mapping.
 * Extracted from `api-v1-reviews/index.ts` — no changes.
 */

export function transformReview(data: Record<string, unknown>) {
  return {
    id: data.id,
    revieweeId: data.profile_id,
    postId: data.post_id,
    reviewerId: data.profile_id,
    rating: data.reviewed_rating,
    feedback: data.feedback,
    createdAt: data.created_at,
  };
}
