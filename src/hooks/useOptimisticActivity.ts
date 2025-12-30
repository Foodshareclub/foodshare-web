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

// ============================================================================
// Hook: useOptimisticComments
// ============================================================================

interface OptimisticComment {
  id: string | number;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  isPending?: boolean;
}

/**
 * Hook for optimistic comment/message list updates
 *
 * @example
 * ```tsx
 * const { comments, addComment, removeComment, isPending } = useOptimisticComments(initialComments);
 *
 * const handleSubmit = async (content: string) => {
 *   const tempId = `temp-${Date.now()}`;
 *   addComment({ id: tempId, content, author: currentUser, createdAt: new Date().toISOString() });
 *   const result = await postComment(forumId, content);
 *   // Realtime will update with real ID, or handle error
 * };
 * ```
 */
export function useOptimisticComments<T extends OptimisticComment>(initialComments: T[]) {
  const [isPending, startTransition] = useTransition();

  type CommentAction =
    | { type: "add"; comment: T }
    | { type: "remove"; id: string | number }
    | { type: "update"; id: string | number; updates: Partial<T> };

  const [optimisticComments, updateOptimisticComments] = useOptimistic<T[], CommentAction>(
    initialComments,
    (state, action) => {
      switch (action.type) {
        case "add":
          return [...state, { ...action.comment, isPending: true }];
        case "remove":
          return state.filter((c) => c.id !== action.id);
        case "update":
          return state.map((c) =>
            c.id === action.id ? { ...c, ...action.updates, isPending: false } : c
          );
        default:
          return state;
      }
    }
  );

  const addComment = (comment: T): void => {
    startTransition(() => {
      updateOptimisticComments({ type: "add", comment });
    });
  };

  const removeComment = (id: string | number): void => {
    startTransition(() => {
      updateOptimisticComments({ type: "remove", id });
    });
  };

  const updateComment = (id: string | number, updates: Partial<T>): void => {
    startTransition(() => {
      updateOptimisticComments({ type: "update", id, updates });
    });
  };

  return {
    comments: optimisticComments,
    addComment,
    removeComment,
    updateComment,
    isPending,
  };
}

// ============================================================================
// Hook: useOptimisticList
// ============================================================================

/**
 * Generic hook for optimistic list operations
 * Works with any item type that has an id field
 *
 * @example
 * ```tsx
 * const { items, addItem, removeItem, updateItem } = useOptimisticList(initialItems);
 * ```
 */
export function useOptimisticList<T extends { id: string | number }>(initialItems: T[]) {
  const [isPending, startTransition] = useTransition();

  type ListAction =
    | { type: "add"; item: T }
    | { type: "remove"; id: string | number }
    | { type: "update"; id: string | number; updates: Partial<T> };

  const [optimisticItems, updateOptimisticItems] = useOptimistic<T[], ListAction>(
    initialItems,
    (state, action) => {
      switch (action.type) {
        case "add":
          return [...state, action.item];
        case "remove":
          return state.filter((item) => item.id !== action.id);
        case "update":
          return state.map((item) =>
            item.id === action.id ? { ...item, ...action.updates } : item
          );
        default:
          return state;
      }
    }
  );

  const addItem = (item: T): void => {
    startTransition(() => {
      updateOptimisticItems({ type: "add", item });
    });
  };

  const removeItem = (id: string | number): void => {
    startTransition(() => {
      updateOptimisticItems({ type: "remove", id });
    });
  };

  const updateItem = (id: string | number, updates: Partial<T>): void => {
    startTransition(() => {
      updateOptimisticItems({ type: "update", id, updates });
    });
  };

  return {
    items: optimisticItems,
    addItem,
    removeItem,
    updateItem,
    isPending,
  };
}
