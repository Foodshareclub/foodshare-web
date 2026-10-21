"use server";

/**
 * Post View Tracking Server Actions
 *
 * Bleeding-edge implementation with:
 * - Debounced view counting (prevents spam)
 * - Session-based deduplication
 * - Optimistic update support
 * - Background activity logging
 *
 * @module app/actions/post-views
 */

import { logPostView } from "@/app/actions/post-activity";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { type ActionResult, createError, failure, withErrorHandling } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";

// ============================================================================
// View Deduplication (Session-based)
// ============================================================================

const VIEW_COOLDOWN_MS = 30 * 1000; // 30 seconds between views of same post
const viewedPosts = new Map<string, number>(); // key: `${sessionId}-${postId}`, value: timestamp

function getViewKey(sessionId: string, postId: number): string {
  return `${sessionId}-${postId}`;
}

function canRecordView(sessionId: string, postId: number): boolean {
  const key = getViewKey(sessionId, postId);
  const lastView = viewedPosts.get(key);
  const now = Date.now();

  if (!lastView || now - lastView > VIEW_COOLDOWN_MS) {
    viewedPosts.set(key, now);
    return true;
  }

  return false;
}

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewedPosts.entries()) {
    if (now - timestamp > VIEW_COOLDOWN_MS * 2) {
      viewedPosts.delete(key);
    }
  }
}, 60 * 1000);

// ============================================================================
// Schemas
// ============================================================================

const incrementViewSchema = z.object({
  postId: z.number().int().positive(),
  referrer: z.string().optional(),
  source: z.enum(["direct", "search", "social", "internal"]).optional(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Increment post view count with deduplication
 * Returns optimistic view count immediately
 */
export async function incrementPostView(
  postId: number,
  options?: { referrer?: string; source?: "direct" | "search" | "social" | "internal" },
): Promise<ActionResult<{ views: number; recorded: boolean }>> {
  // Validate input
  const validation = incrementViewSchema.safeParse({ postId, ...options });
  if (!validation.success) {
    return failure(createError("VALIDATION_ERROR", "Invalid post ID"));
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();
    const headersList = await headers();
    const cookieStore = await cookies();

    // Get session identifier (use cookie or IP as fallback)
    const sessionId =
      cookieStore.get("session_id")?.value || headersList.get("x-forwarded-for")?.split(",")[0] || "anonymous";

    // Get current user (optional - views can be anonymous)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if we should record this view (deduplication)
    const shouldRecord = canRecordView(sessionId, postId);

    // Only needed for the two paths that cannot learn the count from the RPC:
    // a deduplicated view, and the graceful-degradation path if it errors.
    const { data: currentPost } = await supabase.from("posts").select("post_views").eq("id", postId).single();

    const currentViews = currentPost?.post_views || 0;

    if (!shouldRecord) {
      // Return current count without incrementing (deduplicated)
      return { views: currentViews, recorded: false };
    }

    // Increment atomically in the database. This used to be a read-modify-write
    // (SELECT then UPDATE with the incremented value), which silently lost
    // updates whenever two views landed concurrently. The RPC does the
    // increment under a row lock and returns the authoritative value, so no
    // second round-trip is needed.
    const { data: newViews, error } = await supabase.rpc("increment_post_view", {
      p_post_id: postId,
    });

    if (error) {
      console.error("[incrementPostView] Increment error:", error.message);
      // Return current count on error (graceful degradation)
      return { views: currentViews, recorded: false };
    }

    // Log view activity in background (non-blocking)
    logPostView(postId, {
      user_id: user?.id || null,
      session_id: sessionId,
      referrer: options?.referrer,
      source: options?.source || "direct",
    }).catch((err) => {
      console.error("[incrementPostView] Activity log error:", err);
    });

    // Invalidate cache for this post
    invalidateTag(CACHE_TAGS.PRODUCT(postId));

    // A null return means the post row does not exist (the UPDATE matched
    // nothing), so nothing was recorded.
    if (newViews === null) {
      return { views: currentViews, recorded: false };
    }

    return { views: Number(newViews), recorded: true };
  }, "incrementPostView");
}

/**
 * Get post view count (cached via data layer)
 */
export async function getPostViewCount(postId: number): Promise<ActionResult<{ views: number }>> {
  if (!postId || postId <= 0) {
    return failure(createError("VALIDATION_ERROR", "Invalid post ID"));
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase.from("posts").select("post_views").eq("id", postId).single();

    if (error) throw new Error(error.message);

    return { views: data?.post_views || 0 };
  }, "getPostViewCount");
}

/**
 * Batch get view counts for multiple posts
 * Optimized for list views
 */
export async function getBatchViewCounts(postIds: number[]): Promise<ActionResult<Record<number, number>>> {
  if (!postIds.length || postIds.length > 100) {
    return failure(createError("VALIDATION_ERROR", "Invalid post IDs (max 100)"));
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase.from("posts").select("id,post_views").in("id", postIds);

    if (error) throw new Error(error.message);

    const counts: Record<number, number> = {};
    for (const post of data || []) {
      counts[post.id] = post.post_views || 0;
    }

    return counts;
  }, "getBatchViewCounts");
}

/**
 * Record view with full metadata (for analytics)
 * Use this for detailed tracking on post detail pages
 */
export async function recordDetailedView(
  postId: number,
  metadata: {
    referrer?: string;
    source?: "direct" | "search" | "social" | "internal";
    duration?: number;
    scrollDepth?: number;
  },
): Promise<ActionResult<void>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();
    const headersList = await headers();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Log detailed view activity
    await logPostView(postId, {
      user_id: user?.id || null,
      referrer: metadata.referrer,
      source: metadata.source || "direct",
      duration_ms: metadata.duration,
      scroll_depth: metadata.scrollDepth,
      user_agent: headersList.get("user-agent"),
    });

    return undefined;
  }, "recordDetailedView");
}
