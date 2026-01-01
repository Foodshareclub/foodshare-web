/**
 * Reviews API Client
 *
 * Provides functions for calling the api-v1-reviews Edge Function.
 * Used for review operations after food exchanges.
 */

import { apiGet, apiPost } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types (match Edge Function schemas)
// =============================================================================

export interface SubmitReviewRequest {
  revieweeId: string;
  postId: number;
  rating: number;
  feedback?: string;
}

export interface ReviewResponse {
  id: string;
  revieweeId: string;
  postId: number;
  reviewerId: string;
  rating: number;
  feedback: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface ReviewsListResponse {
  data: ReviewResponse[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-reviews";

/**
 * Get reviews for a user
 */
export async function getReviewsForUserAPI(
  userId: string,
  options?: { cursor?: string; limit?: number }
): Promise<ActionResult<ReviewsListResponse>> {
  return apiGet<ReviewsListResponse>(ENDPOINT, {
    userId,
    cursor: options?.cursor,
    limit: options?.limit,
  });
}

/**
 * Get reviews for a post
 */
export async function getReviewsForPostAPI(
  postId: number,
  options?: { cursor?: string; limit?: number }
): Promise<ActionResult<ReviewsListResponse>> {
  return apiGet<ReviewsListResponse>(ENDPOINT, {
    postId: postId.toString(),
    cursor: options?.cursor,
    limit: options?.limit,
  });
}

/**
 * Submit a review
 */
export async function submitReviewAPI(
  input: SubmitReviewRequest
): Promise<ActionResult<ReviewResponse>> {
  return apiPost<ReviewResponse, SubmitReviewRequest>(ENDPOINT, input);
}

// =============================================================================
// Helpers for Server Actions
// =============================================================================

/**
 * Convert FormData to SubmitReviewRequest
 */
export function formDataToReviewInput(formData: FormData): SubmitReviewRequest {
  return {
    revieweeId: formData.get("profile_id") as string,
    postId: Number(formData.get("post_id")),
    rating: Number(formData.get("reviewed_rating")),
    feedback: (formData.get("feedback") as string) || undefined,
  };
}
