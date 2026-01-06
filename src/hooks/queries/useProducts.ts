"use client";

/**
 * Products React Query Hooks
 *
 * Provides infinite scroll and pagination hooks for products.
 * Uses cursor-based pagination with the /api/products endpoint.
 */

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InitialProductStateType } from "@/types/product.types";

// ============================================================================
// Types
// ============================================================================

interface PaginatedProductsResponse {
  data: InitialProductStateType[];
  nextCursor: number | null;
  hasMore: boolean;
}

interface UseProductsParams {
  type?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseUserProductsParams {
  userId: string;
  enabled?: boolean;
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchProducts(params: {
  type?: string;
  cursor?: number | null;
  limit: number;
}): Promise<PaginatedProductsResponse> {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
  });

  if (params.type && params.type !== "all") {
    searchParams.set("type", params.type);
  }

  if (params.cursor) {
    searchParams.set("cursor", String(params.cursor));
  }

  const response = await fetch(`/api/products?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

async function fetchUserProducts(userId: string): Promise<InitialProductStateType[]> {
  const response = await fetch(`/api/products?userId=${encodeURIComponent(userId)}`);

  if (!response.ok) {
    throw new Error("Failed to fetch user products");
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for infinite scrolling products
 * Supports lazy loading with cursor-based pagination
 */
export function useInfiniteProducts({
  type = "food",
  limit = 20,
  enabled = true,
}: UseProductsParams = {}) {
  return useInfiniteQuery({
    queryKey: ["products", "infinite", { type, limit }],
    queryFn: ({ pageParam }) => fetchProducts({ type, cursor: pageParam, limit }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for paginated products (single page)
 * Useful for initial server-rendered page with client-side refresh
 */
export function useProducts({ type = "food", limit = 20, enabled = true }: UseProductsParams = {}) {
  return useQuery({
    queryKey: ["products", { type, limit }],
    queryFn: () => fetchProducts({ type, limit }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for user's own products
 * Useful for "My Posts" page with infinite scroll
 */
export function useUserProducts({ userId, enabled = true }: UseUserProductsParams) {
  return useQuery({
    queryKey: ["products", "user", userId],
    queryFn: () => fetchUserProducts(userId),
    enabled: enabled && !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Helper to flatten infinite query pages into a single array
 */
export function flattenProductPages(
  pages: PaginatedProductsResponse[] | undefined
): InitialProductStateType[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * Hook to prefetch products for a type
 * Useful for prefetching on hover or route change
 */
export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  return (type: string, limit = 20) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ["products", "infinite", { type, limit }],
      queryFn: ({ pageParam }) => fetchProducts({ type, cursor: pageParam, limit }),
      initialPageParam: null as number | null,
    });
  };
}

/**
 * Hook to invalidate products cache
 * Call after mutations that affect products
 */
export function useInvalidateProducts() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    invalidateType: (type: string) =>
      queryClient.invalidateQueries({ queryKey: ["products", "infinite", { type }] }),
    invalidateUser: (userId: string) =>
      queryClient.invalidateQueries({ queryKey: ["products", "user", userId] }),
  };
}
