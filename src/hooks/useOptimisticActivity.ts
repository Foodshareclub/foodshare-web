"use client";

/**
 * Optimistic Activity Hook
 *
 * Provides optimistic UI updates for post activity actions.
 * Bleeding-edge pattern using React 19's useOptimistic.
 *
 * @module hooks/useOptimisticActivity
 */

import { useOptimistic, useTransition } from "react";
import type { PostActivityCounts, PostActivityType } from "@/types/post-activity.types";

// ============================================================================
// Types
// ============================================================================

interface OptimisticAction {
  type: "increment" | "decrement";
  activityType: PostActivityType;
}

// ============================================================================
// Hook: useOptimisticActivityCounts
// ============================================================================

/**
 * Hook for optimistic activity count updates
 *
 * @example
 * ```tsx
 * const { counts, incrementCount, isPending } = useOptimisticActivityCounts(initialCounts);
 *
 * const handleLike = async () => {
 *   incrementCount("liked");
 *   await likePost(postId);
 * };
 * ```
 */
export function useOptimisticActivityCounts(initialCounts: PostActivityCounts) {
  const [isPending, startTransition] = useTransition();

  const [optimisticCounts, updateOptimisticCounts] = useOptimistic<
    PostActivityCounts,
    OptimisticAction
  >(initialCounts, (state, action) => {
    const currentCount = state[action.activityType] || 0;
    const newCount = action.type === "increment" ? currentCount + 1 : Math.max(0, currentCount - 1);

    return {
      ...state,
      [action.activityType]: newCount,
    };
  });

  const incrementCount = (activityType: PostActivityType): void => {
    startTransition(() => {
      updateOptimisticCounts({ type: "increment", activityType });
    });
  };

  const decrementCount = (activityType: PostActivityType): void => {
    startTransition(() => {
      updateOptimisticCounts({ type: "decrement", activityType });
    });
  };

  return {
    counts: optimisticCounts,
    incrementCount,
    decrementCount,
    isPending,
  };
}

// ============================================================================
// Hook: useOptimisticViews
// ============================================================================

/**
 * Hook for optimistic view count updates
 *
 * @example
 * ```tsx
 * const { views, recordView, isPending } = useOptimisticViews(initialViews);
 *
 * useEffect(() => {
 *   recordView();
 *   incrementPostView(postId);
 * }, []);
 * ```
 */
export function useOptimisticViews(initialViews: number) {
  const [isPending, startTransition] = useTransition();

  const [optimisticViews, updateOptimisticViews] = useOptimistic<number, void>(
    initialViews,
    (state) => state + 1
  );

  const recordView = (): void => {
    startTransition(() => {
      updateOptimisticViews();
    });
  };

  return {
    views: optimisticViews,
    recordView,
    isPending,
  };
}

// ============================================================================
// Hook: useOptimisticLike
// ============================================================================

interface LikeState {
  isLiked: boolean;
  count: number;
}

/**
 * Hook for optimistic like/unlike toggle
 *
 * @example
 * ```tsx
 * const { isLiked, count, toggleLike, isPending } = useOptimisticLike({
 *   isLiked: initialIsLiked,
 *   count: initialLikeCount,
 * });
 *
 * const handleLike = async () => {
 *   toggleLike();
 *   await (isLiked ? unlikePost(postId) : likePost(postId));
 * };
 * ```
 */
export function useOptimisticLike(initialState: LikeState) {
  const [isPending, startTransition] = useTransition();

  const [optimisticState, updateOptimisticState] = useOptimistic<LikeState, void>(
    initialState,
    (state) => ({
      isLiked: !state.isLiked,
      count: state.isLiked ? state.count - 1 : state.count + 1,
    })
  );

  const toggleLike = (): void => {
    startTransition(() => {
      updateOptimisticState();
    });
  };

  return {
    isLiked: optimisticState.isLiked,
    count: optimisticState.count,
    toggleLike,
    isPending,
  };
}

// ============================================================================
// Hook: useOptimisticBookmark
// ============================================================================

/**
 * Hook for optimistic bookmark toggle
 */
export function useOptimisticBookmark(initialIsBookmarked: boolean) {
  const [isPending, startTransition] = useTransition();

  const [isBookmarked, updateOptimisticBookmark] = useOptimistic<boolean, void>(
    initialIsBookmarked,
    (state) => !state
  );

  const toggleBookmark = (): void => {
    startTransition(() => {
      updateOptimisticBookmark();
    });
  };

  return {
    isBookmarked,
    toggleBookmark,
    isPending,
  };
}
