/**
 * Reviews Schemas (using shared validation constants from Swift FoodshareCore)
 *
 * Extracted from `api-v1-reviews/index.ts` — no changes.
 */

import { positiveIntSchema, uuidSchema, z } from "../../_shared/schemas/common.ts";
import { REVIEW } from "../../_shared/validation-rules.ts";

export const submitReviewSchema = z.object({
  revieweeId: uuidSchema, // Profile being reviewed
  postId: positiveIntSchema,
  rating: z.number().int().min(REVIEW.rating.min).max(REVIEW.rating.max),
  feedback: z.string().max(REVIEW.comment.maxLength).optional(),
});

export const querySchema = z.object({
  userId: uuidSchema.optional(),
  postId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export type SubmitReviewBody = z.infer<typeof submitReviewSchema>;
export type QueryParams = z.infer<typeof querySchema>;
