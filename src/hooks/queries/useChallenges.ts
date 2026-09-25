"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InitialProductStateType } from "@/types/product.types";
import type { PaginatedChallengesResponse } from "@/lib/data/challenges";

// ============================================================================
// Types
// ============================================================================

interface UseChallengesParams {
  searchTerm?: string;
  limit?: number;
  difficulty?: string;
  enabled?: boolean;
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchChallenges(params: {
  searchTerm?: string;
  page: number;
  limit: number;
  difficulty?: string;
}): Promise<PaginatedChallengesResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.difficulty && params.difficulty !== "all") {
    searchParams.set("difficulty", params.difficulty);
  }
  if (params.searchTerm?.trim()) searchParams.set("key_word", params.searchTerm.trim());

  const response = await fetch(`/api/challenges?${searchParams.toString()}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch challenges");
  }

  const result = await response.json();
  if (!result.success || !result.data) throw new Error("Failed to fetch challenges");
  return result.data as PaginatedChallengesResponse;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for infinite scrolling challenges
 * Supports lazy loading with pagination
 */
export function useInfiniteChallenges({
  limit = 12,
  difficulty,
  searchTerm,
  enabled = true,
}: UseChallengesParams = {}) {
  return useInfiniteQuery({
    queryKey: ["challenges", "infinite", { limit, difficulty, searchTerm }],
    queryFn: ({ pageParam = 1 }) =>
      fetchChallenges({ page: pageParam, limit, difficulty, searchTerm }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.pagination.page > 1 ? firstPage.pagination.page - 1 : undefined,
    enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
  });
}

/**
 * Hook for paginated challenges (single page)
 */
export function useChallenges({
  limit = 12,
  difficulty,
  enabled = true,
}: UseChallengesParams = {}) {
  return useQuery({
    queryKey: ["challenges", { limit, difficulty }],
    queryFn: () => fetchChallenges({ page: 1, limit, difficulty }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Helper to flatten infinite query pages into a single array
 */
export function flattenChallengesPages(
  pages: PaginatedChallengesResponse[] | undefined
): InitialProductStateType[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * Hook for deck challenges with initial server data
 * Uses server data initially, enables client-side refresh
 */
export function useDeckChallenges(
  initialData: InitialProductStateType[],
  options: UseChallengesParams = {}
) {
  const { limit = 12, difficulty, searchTerm } = options;

  return useQuery({
    queryKey: ["challenges", "deck", { limit, difficulty, searchTerm }],
    queryFn: async () => {
      const result = await fetchChallenges({ page: 1, limit, difficulty, searchTerm });
      return result.data;
    },
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes - keep initial data fresh longer
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
