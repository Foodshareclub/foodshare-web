/**
 * Engagement API Client
 *
 * Provides functions for calling the api-v1-engagement Edge Function.
 * Used for likes, bookmarks, and shares.
 */

import { apiCall, apiGet, apiPost } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types (match Edge Function schemas)
// =============================================================================

export interface EngagementStatus {
  postId: number;
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
}

export interface BatchEngagementStatus {
  [postId: number]: {
    isLiked: boolean;
    isBookmarked: boolean;
    likeCount: number;
  };
}

export interface ToggleLikeResponse {
  postId: number;
  isLiked: boolean;
  likeCount: number;
}

export interface ToggleBookmarkResponse {
  postId: number;
  isBookmarked: boolean;
}

export interface UserBookmarksResponse {
  postIds: number[];
  count: number;
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-engagement";

/**
 * Get engagement status for a single post
 */
export async function getEngagementAPI(
  postId: number
): Promise<ActionResult<EngagementStatus>> {
  return apiGet<EngagementStatus>(ENDPOINT, {
    postId: postId.toString(),
  });
}

/**
 * Get engagement status for multiple posts (batch)
 */
export async function getBatchEngagementAPI(
  postIds: number[]
): Promise<ActionResult<BatchEngagementStatus>> {
  return apiGet<BatchEngagementStatus>(ENDPOINT, {
    postIds: postIds.join(","),
  });
}

/**
 * Toggle like on a post
 */
export async function toggleLikeAPI(
  postId: number
): Promise<ActionResult<ToggleLikeResponse>> {
  return apiCall<ToggleLikeResponse, { postId: number }>(ENDPOINT, {
    method: "POST",
    body: { postId },
    query: { action: "like" },
  });
}

/**
 * Toggle bookmark on a post
 */
export async function toggleBookmarkAPI(
  postId: number
): Promise<ActionResult<ToggleBookmarkResponse>> {
  return apiCall<ToggleBookmarkResponse, { postId: number }>(ENDPOINT, {
    method: "POST",
    body: { postId },
    query: { action: "bookmark" },
  });
}

/**
 * Record a share
 */
export async function recordShareAPI(
  postId: number,
  method: "link" | "social" | "email" | "other" = "link"
): Promise<ActionResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }, { postId: number; method: string }>(ENDPOINT, {
    method: "POST",
    body: { postId, method },
    query: { action: "share" },
  });
}

/**
 * Get user's bookmarked post IDs
 */
export async function getUserBookmarksAPI(
  limit?: number
): Promise<ActionResult<UserBookmarksResponse>> {
  return apiGet<UserBookmarksResponse>(ENDPOINT, {
    action: "bookmarks",
    limit: limit?.toString(),
  });
}
