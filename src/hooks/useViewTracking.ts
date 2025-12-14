"use client";

/**
 * View Tracking Hook
 *
 * Automatically tracks post views with deduplication.
 * Bleeding-edge pattern with intersection observer for visibility tracking.
 *
 * @module hooks/useViewTracking
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { incrementPostView, recordDetailedView } from "@/app/actions/post-views";

// ============================================================================
// Types
// ============================================================================

interface UseViewTrackingOptions {
  /** Post ID to track */
  postId: number;
  /** Minimum time visible before counting as view (ms) */
  minVisibleTime?: number;
  /** Track scroll depth */
  trackScrollDepth?: boolean;
  /** Track time on page */
  trackDuration?: boolean;
  /** Referrer source */
  referrer?: string;
  /** Traffic source */
  source?: "direct" | "search" | "social" | "internal";
  /** Callback when view is recorded */
  onViewRecorded?: (views: number) => void;
}

// ============================================================================
// Hook: useViewTracking
// ============================================================================

/**
 * Hook for automatic view tracking with visibility detection
 *
 * @example
 * ```tsx
 * function PostDetail({ post }) {
 *   const { ref, viewCount, hasRecordedView } = useViewTracking({
 *     postId: post.id,
 *     trackScrollDepth: true,
 *     trackDuration: true,
 *   });
 *
 *   return (
 *     <article ref={ref}>
 *       <h1>{post.title}</h1>
 *       {viewCount && <span>{viewCount} views</span>}
 *     </article>
 *   );
 * }
 * ```
 */
export function useViewTracking(options: UseViewTrackingOptions) {
  const {
    postId,
    minVisibleTime = 1000,
    trackScrollDepth = false,
    trackDuration = false,
    referrer,
    source = "direct",
    onViewRecorded,
  } = options;

  const ref = useRef<HTMLElement>(null);

  // Use state for values that need to be returned (React Compiler requirement)
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [scrollDepth, setScrollDepth] = useState(0);

  // Use refs for internal tracking only (not returned)
  const startTimeRef = useRef<number>(0);
  const hasRecordedRef = useRef(false);
  const scrollDepthRef = useRef(0);

  // Initialize start time on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Record the view
  const recordView = useCallback(async () => {
    if (hasRecordedRef.current) return;

    hasRecordedRef.current = true;
    setHasRecordedView(true);

    const result = await incrementPostView(postId, { referrer, source });

    if (result.success) {
      setViewCount(result.data.views);
      onViewRecorded?.(result.data.views);
    }
  }, [postId, referrer, source, onViewRecorded]);

  // Record detailed view on unmount
  const recordDetailedViewOnUnmount = useCallback(async () => {
    if (!trackDuration && !trackScrollDepth) return;

    const duration = Date.now() - startTimeRef.current;

    await recordDetailedView(postId, {
      referrer,
      source,
      duration,
      scrollDepth: scrollDepthRef.current,
    });
  }, [postId, referrer, source, trackDuration, trackScrollDepth]);

  // Intersection Observer for visibility
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let visibilityTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          // Start timer when visible
          visibilityTimer = setTimeout(() => {
            recordView();
          }, minVisibleTime);
        } else if (visibilityTimer) {
          // Clear timer if hidden before minVisibleTime
          clearTimeout(visibilityTimer);
          visibilityTimer = null;
        }
      },
      { threshold: 0.5 } // 50% visible
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [minVisibleTime, recordView]);

  // Scroll depth tracking
  useEffect(() => {
    if (!trackScrollDepth) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      if (scrollPercent > scrollDepthRef.current) {
        scrollDepthRef.current = scrollPercent;
        setScrollDepth(scrollPercent);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [trackScrollDepth]);

  // Record detailed view on unmount
  useEffect(() => {
    return () => {
      recordDetailedViewOnUnmount();
    };
  }, [recordDetailedViewOnUnmount]);

  return {
    ref,
    viewCount,
    hasRecordedView,
    scrollDepth,
  };
}

// ============================================================================
// Hook: useSimpleViewTracking
// ============================================================================

/**
 * Simple view tracking - just records a view on mount
 *
 * @example
 * ```tsx
 * function PostDetail({ post }) {
 *   useSimpleViewTracking(post.id);
 *   return <article>...</article>;
 * }
 * ```
 */
export function useSimpleViewTracking(postId: number) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    incrementPostView(postId).catch((err) => {
      console.error("[useSimpleViewTracking] Error:", err);
    });
  }, [postId]);
}

export default useViewTracking;
