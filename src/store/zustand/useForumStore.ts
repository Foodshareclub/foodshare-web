/**
 * Forum Store (Zustand)
 * Manages forum UI state (filters, pagination, notifications)
 * Data fetching handled by TanStack Query
 * Replaces Redux forum slice UI state
 */

import { create } from "zustand";
import type { ForumPostType } from "@/api/forumAPI";

// ============================================================================
// Types
// ============================================================================

type SortOption = "latest" | "popular" | "hot" | "unanswered";

interface ForumFilters {
  categoryId: number | null;
  tagId: number | null;
  sortBy: SortOption;
  postType: ForumPostType | "all";
  searchQuery: string;
}

interface ForumState {
  // Filters
  filters: ForumFilters;
  setFilters: (filters: Partial<ForumFilters>) => void;
  resetFilters: () => void;

  // Pagination
  offset: number;
  setOffset: (offset: number) => void;
  resetOffset: () => void;
  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;

  // Currently selected/viewed post
  selectedPostId: number | null;
  setSelectedPostId: (id: number | null) => void;

  // UI State
  isComposerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  replyingToCommentId: number | null;
  setReplyingToCommentId: (id: number | null) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultFilters: ForumFilters = {
  categoryId: null,
  tagId: null,
  sortBy: "latest",
  postType: "all",
  searchQuery: "",
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useForumStore = create<ForumState>((set, get) => ({
  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      offset: 0, // Reset pagination when filters change
      hasMore: true,
    })),
  resetFilters: () =>
    set({
      filters: defaultFilters,
      offset: 0,
      hasMore: true,
    }),

  // Pagination
  offset: 0,
  setOffset: (offset) => set({ offset }),
  resetOffset: () => set({ offset: 0, hasMore: true }),
  hasMore: true,
  setHasMore: (hasMore) => set({ hasMore }),

  // Selected post
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),

  // UI State
  isComposerOpen: false,
  setComposerOpen: (open) => set({ isComposerOpen: open }),
  replyingToCommentId: null,
  setReplyingToCommentId: (id) => set({ replyingToCommentId: id }),

  // Reset
  reset: () =>
    set({
      filters: defaultFilters,
      offset: 0,
      hasMore: true,
      selectedPostId: null,
      isComposerOpen: false,
      replyingToCommentId: null,
    }),
}));

// ============================================================================
// Selectors (pure functions for use with useForumStore)
// ============================================================================

export const selectForumFilters = (state: ForumState) => state.filters;
export const selectForumOffset = (state: ForumState) => state.offset;

// ============================================================================
// Custom Hooks (convenience hooks for common selections)
// ============================================================================

export const useForumFilters = () => useForumStore(selectForumFilters);
export const useForumOffset = () => useForumStore(selectForumOffset);

// Note: Forum notifications migrated to React Query — see useForumNotifications.ts
