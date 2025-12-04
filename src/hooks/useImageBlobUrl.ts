'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

interface UseImageBlobUrlOptions {
  /** Query key for React Query */
  queryKey: readonly unknown[];
  /** Function to fetch the blob data */
  fetchFn: () => Promise<Blob | null>;
  /** Whether the query is enabled */
  enabled?: boolean;
  /** Stale time in ms */
  staleTime?: number;
  /** Garbage collection time in ms */
  gcTime?: number;
}

interface UseImageBlobUrlResult extends Omit<UseQueryResult<string | null, Error>, 'data'> {
  /** The blob URL (properly managed with cleanup) */
  blobUrl: string | null;
  /** Alias for blobUrl for backward compatibility */
  data: string | null;
}

/**
 * Hook for managing image blob URLs with proper memory cleanup.
 *
 * This hook ensures that blob URLs created via URL.createObjectURL()
 * are properly revoked when:
 * - The component unmounts
 * - A new blob URL replaces the old one
 * - The query is refetched
 *
 * @example
 * ```tsx
 * const { blobUrl, isLoading } = useImageBlobUrl({
 *   queryKey: ['image', imagePath],
 *   fetchFn: async () => {
 *     const { data } = await storageAPI.downloadImage({ path: imagePath });
 *     return data;
 *   },
 *   enabled: !!imagePath,
 * });
 * ```
 */
export function useImageBlobUrl({
  queryKey,
  fetchFn,
  enabled = true,
  staleTime = 30 * 60 * 1000, // 30 minutes
  gcTime = 60 * 60 * 1000, // 1 hour
}: UseImageBlobUrlOptions): UseImageBlobUrlResult {
  // Track the current blob URL for cleanup
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup function to revoke blob URLs
  const cleanup = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Query to fetch the blob and create URL
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      // Clean up previous URL before creating new one
      cleanup();

      const blob = await fetchFn();
      if (blob) {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        return url;
      }
      return null;
    },
    enabled,
    staleTime,
    gcTime,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Cleanup when data changes (e.g., on refetch)
  useEffect(() => {
    // If query data changed but ref doesn't match, update ref
    if (queryResult.data && queryResult.data !== blobUrlRef.current) {
      // The old URL was already cleaned up in queryFn
      blobUrlRef.current = queryResult.data;
    }
  }, [queryResult.data]);

  const { data, ...rest } = queryResult;
  const blobUrl = data ?? null;

  return {
    blobUrl,
    data: blobUrl, // Backward compatibility alias
    ...rest,
  };
}

export default useImageBlobUrl;
