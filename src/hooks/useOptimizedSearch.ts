/**
 * Optimized Search Hook
 *
 * Features:
 * - Smart debouncing (300ms)
 * - Request cancellation
 * - Cache integration
 * - Loading states
 * - Error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./useDebounce";
import { apiCache } from "@/lib/api-cache";

interface UseOptimizedSearchOptions<T> {
  searchFn: (query: string) => Promise<T>;
  debounceMs?: number;
  minQueryLength?: number;
  cacheKey?: string;
  cacheTTL?: number;
  onSuccess?: (results: T) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedSearchReturn<T> {
  results: T | null;
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useOptimizedSearch<T = any>({
  searchFn,
  debounceMs = 300,
  minQueryLength = 2,
  cacheKey = "search",
  cacheTTL = 300000, // 5 minutes
  onSuccess,
  onError,
}: UseOptimizedSearchOptions<T>): UseOptimizedSearchReturn<T> {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Search function with caching and cancellation
  const performSearch = useCallback(
    async (searchQuery: string) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Skip if query too short
      if (searchQuery.length < minQueryLength) {
        setResults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        // Use cache with stale-while-revalidate
        const cacheKeyWithQuery = `${cacheKey}:${searchQuery}`;

        const data = await apiCache.get(cacheKeyWithQuery, () => searchFn(searchQuery), {
          ttl: cacheTTL,
          staleWhileRevalidate: true,
        });

        // Check if request was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setResults(data);
        setIsLoading(false);
        onSuccess?.(data);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const error = err instanceof Error ? err : new Error("Search failed");
        setError(error);
        setIsLoading(false);
        onError?.(error);
      }
    },
    [searchFn, minQueryLength, cacheKey, cacheTTL, onSuccess, onError]
  );

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults(null);
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, performSearch]);

  // Public search function
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Clear function
  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setError(null);
    setIsLoading(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}

/**
 * Specialized hook for product search
 */
export function useProductSearch() {
  return useOptimizedSearch({
    searchFn: async (query: string) => {
      const { productAPI } = await import("@/api/productAPI");
      const { data, error } = await productAPI.searchProducts(query, "all");

      if (error) throw error;
      return data;
    },
    cacheKey: "product-search",
    minQueryLength: 2,
    debounceMs: 300,
  });
}
