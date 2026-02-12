"use server";

/**
 * Post Engagement Server Actions
 *
 * Handles likes, bookmarks, and shares with:
 * - Optimistic update support
 * - Activity logging
 * - Cache invalidation
 * - Edge Function routing (when enabled)
 *
 * @module app/actions/post-engagement
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  withErrorHandling,
  validateWithSchema,
  failure,
  createError,
} from "@/lib/errors";
import { logPostActivity, logPostShared } from "@/app/actions/post-activity";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag, invalidatePostActivityCaches } from "@/lib/data/cache-invalidation";
import { toggleLikeAPI, toggleBookmarkAPI } from "@/lib/api/engagement";

// Feature flag for Edge Function migration
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_ENGAGEMENT === "true";

// ============================================================================
// Schemas
// ============================================================================

const postIdSchema = z.object({
  postId: z.number().int().positive(),
});

const shareSchema = z.object({
  postId: z.number().int().positive(),
  method: z.enum(["link", "social", "email", "other"]),
});

// ============================================================================
// Like Actions
// ============================================================================

/**
 * Toggle like on a post
 * Returns new like state and count
 */
export async function togglePostLike(
  postId: number
): Promise<ActionResult<{ isLiked: boolean; likeCount: number }>> {
  const validation = validateWithSchema(postIdSchema, { postId });
  if (!validation.success) return validation;

  // ==========================================================================
  // Edge Function Path (when enabled)
  // ==========================================================================
  if (USE_EDGE_FUNCTIONS) {
    const result = await toggleLikeAPI(postId);

    if (result.success) {
      invalidateTag(CACHE_TAGS.PRODUCT(postId));
      invalidatePostActivityCaches(postId);
      return {
        success: true,
        data: {
          isLiked: result.data.isLiked,
          likeCount: result.data.likeCount,
        },
      };
    }

    return result as ActionResult<{ isLiked: boolean; likeCount: number }>;
  }

  // ==========================================================================
  // Direct Supabase Path (fallback)
  // ==========================================================================
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .single();

    let isLiked: boolean;

    if (existingLike) {
      // Unlike
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("profile_id", user.id);

      isLiked = false;

      // Log unlike activity
      await logPostActivity({
        postId,
        activityType: "unliked",
        metadata: { unliked_at: new Date().toISOString() },
      });
    } else {
      // Like
      await supabase.from("post_likes").insert({
        post_id: postId,
        profile_id: user.id,
      });

      isLiked = true;

      // Log like activity
      await logPostActivity({
        postId,
        activityType: "liked",
        metadata: { liked_at: new Date().toISOString() },
      });
    }

    // Get updated count
    const { count } = await supabase
      .from("post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    // Invalidate caches
    invalidateTag(CACHE_TAGS.PRODUCT(postId));
    invalidatePostActivityCaches(postId, user.id);

    return { isLiked, likeCount: count || 0 };
  }, "togglePostLike");
}

/**
 * Check if user has liked a post
 */
export async function checkPostLiked(
  postId: number
): Promise<ActionResult<{ isLiked: boolean; likeCount: number }>> {
  const validation = validateWithSchema(postIdSchema, { postId });
  if (!validation.success) return validation;

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get like count
    const { count } = await supabase
      .from("post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    // Check if user liked (if authenticated)
    let isLiked = false;
    if (user) {
      const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("profile_id", user.id)
        .single();

      isLiked = !!existingLike;
    }

    return { isLiked, likeCount: count || 0 };
  }, "checkPostLiked");
}

// ============================================================================
// Bookmark Actions
// ============================================================================

/**
 * Toggle bookmark on a post
 */
export async function togglePostBookmark(
  postId: number
): Promise<ActionResult<{ isBookmarked: boolean }>> {
  const validation = validateWithSchema(postIdSchema, { postId });
  if (!validation.success) return validation;

  // ==========================================================================
  // Edge Function Path (when enabled)
  // ==========================================================================
  if (USE_EDGE_FUNCTIONS) {
    const result = await toggleBookmarkAPI(postId);

    if (result.success) {
      invalidateTag(CACHE_TAGS.PRODUCT(postId));
      invalidatePostActivityCaches(postId);
      return {
        success: true,
        data: { isBookmarked: result.data.isBookmarked },
      };
    }

    return result as ActionResult<{ isBookmarked: boolean }>;
  }

  // ==========================================================================
  // Direct Supabase Path (fallback)
  // ==========================================================================
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from("post_bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .single();

    let isBookmarked: boolean;

    if (existingBookmark) {
      // Remove bookmark
      await supabase
        .from("post_bookmarks")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", user.id);

      isBookmarked = false;

      // Log unbookmark activity
      await logPostActivity({
        postId,
        activityType: "unbookmarked",
        metadata: { unbookmarked_at: new Date().toISOString() },
      });
    } else {
      // Add bookmark
      await supabase.from("post_bookmarks").insert({
        post_id: postId,
        profile_id: user.id,
      });

      isBookmarked = true;

      // Log bookmark activity
      await logPostActivity({
        postId,
        activityType: "bookmarked",
        metadata: { bookmarked_at: new Date().toISOString() },
      });
    }

    // Invalidate caches
    invalidateTag(CACHE_TAGS.PRODUCT(postId));
    invalidatePostActivityCaches(postId, user.id);

    return { isBookmarked };
  }, "togglePostBookmark");
}

/**
 * Check if user has bookmarked a post
 */
export async function checkPostBookmarked(
  postId: number
): Promise<ActionResult<{ isBookmarked: boolean }>> {
  const validation = validateWithSchema(postIdSchema, { postId });
  if (!validation.success) return validation;

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isBookmarked: false };
    }

    const { data: existingBookmark } = await supabase
      .from("post_bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .single();

    return { isBookmarked: !!existingBookmark };
  }, "checkPostBookmarked");
}

/**
 * Get user's bookmarked posts
 */
export async function getUserBookmarks(limit: number = 50): Promise<ActionResult<number[]>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map((b) => b.post_id);
  }, "getUserBookmarks");
}

// ============================================================================
// Share Actions
// ============================================================================

/**
 * Record a post share
 */
export async function recordPostShare(
  postId: number,
  method: "link" | "social" | "email" | "other" = "link"
): Promise<ActionResult<void>> {
  const validation = validateWithSchema(shareSchema, { postId, method });
  if (!validation.success) return validation;

  return withErrorHandling(async () => {
    await logPostShared(postId, method);
    invalidatePostActivityCaches(postId);
    return undefined;
  }, "recordPostShare");
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get engagement status for multiple posts
 * Optimized for list views
 */
export async function getBatchEngagementStatus(
  postIds: number[]
): Promise<
  ActionResult<Record<number, { isLiked: boolean; isBookmarked: boolean; likeCount: number }>>
> {
  if (!postIds.length || postIds.length > 100) {
    return failure(createError("VALIDATION_ERROR", "Invalid post IDs (max 100)"));
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get like counts
    const { data: likeCounts } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    // Count likes per post
    const likeCountMap: Record<number, number> = {};
    for (const like of likeCounts || []) {
      likeCountMap[like.post_id] = (likeCountMap[like.post_id] || 0) + 1;
    }

    // Get user's likes and bookmarks if authenticated
    let userLikes: number[] = [];
    let userBookmarks: number[] = [];

    if (user) {
      const [likesResult, bookmarksResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("profile_id", user.id)
          .in("post_id", postIds),
        supabase
          .from("post_bookmarks")
          .select("post_id")
          .eq("profile_id", user.id)
          .in("post_id", postIds),
      ]);

      userLikes = (likesResult.data || []).map((l) => l.post_id);
      userBookmarks = (bookmarksResult.data || []).map((b) => b.post_id);
    }

    // Build result
    const result: Record<number, { isLiked: boolean; isBookmarked: boolean; likeCount: number }> =
      {};

    for (const postId of postIds) {
      result[postId] = {
        isLiked: userLikes.includes(postId),
        isBookmarked: userBookmarks.includes(postId),
        likeCount: likeCountMap[postId] || 0,
      };
    }

    return result;
  }, "getBatchEngagementStatus");
}
