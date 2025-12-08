'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseImageBlobUrlOptions {
  /** Function to fetch the blob data */
  fetchFn: () => Promise<Blob | null>;
  /** Whether the fetch is enabled */
  enabled?: boolean;
  /** Dependencies that trigger refetch */
  deps?: unknown[];
}

interface UseImageBlobUrlResult {
  /** The blob URL (properly managed with cleanup) */
  blobUrl: string | null;
  /** Alias for blobUrl for backward compatibility */
  data: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing image blob URLs with proper memory cleanup.
 *
 * This hook ensures that blob URLs created via URL.createObjectURL()
 * are properly revoked when:
 * - The component unmounts
 * - A new blob URL replaces the old one
 * - The fetch is triggered again
 *
 * @example
 * ```tsx
 * const { blobUrl, isLoading } = useImageBlobUrl({
 *   fetchFn: async () => {
 *     const { data } = await storageAPI.downloadImage({ path: imagePath });
 *     return data;
 *   },
 *   enabled: !!imagePath,
 *   deps: [imagePath],
 * });
 * ```
 */
export function useImageBlobUrl({
  fetchFn,
  enabled = true,
  deps = [],
}: UseImageBlobUrlOptions): UseImageBlobUrlResult {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track the current blob URL for cleanup
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup function to revoke blob URLs
  const cleanup = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Fetch function
  const fetchBlob = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Clean up previous URL before creating new one
      cleanup();

      const blob = await fetchFn();
      if (blob) {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } else {
        setBlobUrl(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blob'));
      setBlobUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchFn, cleanup]);

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchBlob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    blobUrl,
    data: blobUrl, // Backward compatibility alias
    isLoading,
    error,
    refetch: fetchBlob,
  };
}

export default useImageBlobUrl;
