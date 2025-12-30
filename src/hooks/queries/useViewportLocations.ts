/**
 * Viewport Locations React Query Hook
 * Enterprise-grade caching with IndexedDB persistence and React Query
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { LocationType } from "@/types/product.types";
import type { ViewportBounds } from "@/hooks/useDebouncedViewport";
import { approximateGeoJSON } from "@/utils/postgis";
import { getCachedLocations, setCachedLocations, generateViewportCacheKey } from "@/lib/map-cache";

/**
 * Fetch locations from Supabase RPC (client-side)
 */
async function fetchViewportLocations(
  bounds: ViewportBounds,
  postType?: string
): Promise<LocationType[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_locations_in_viewport", {
    p_north: bounds.north,
    p_south: bounds.south,
    p_east: bounds.east,
    p_west: bounds.west,
    p_post_type: postType?.toLowerCase() ?? null,
  });

  if (error) throw new Error(error.message);

  // Apply location privacy
  return (data ?? []).map((item: LocationType) => ({
    ...item,
    location_json: approximateGeoJSON(item.location_json, item.id),
  }));
}

interface UseViewportLocationsOptions {
  /** Post type to filter by (food, things, fridges, etc.) */
  postType?: string;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 30s for real-time updates) */
  staleTime?: number;
}

interface UseViewportLocationsResult {
  /** Location data for current viewport */
  locations: LocationType[];
  /** Loading state */
  isLoading: boolean;
  /** Whether data is being refetched in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch locations */
  refetch: () => void;
  /** Prefetch adjacent viewports */
  prefetchAdjacent: () => void;
}

/**
 * Hook for fetching map locations within a viewport
 * Uses React Query with IndexedDB persistence for enterprise-grade caching
 */
export function useViewportLocations(
  bounds: ViewportBounds | null,
  options: UseViewportLocationsOptions = {}
): UseViewportLocationsResult {
  const { postType, enabled = true, staleTime = 30 * 1000 } = options; // 30s for real-time updates

  const queryClient = useQueryClient();

  // Generate cache key for this viewport
  const cacheKey = bounds ? generateViewportCacheKey(bounds, postType) : null;

  const query = useQuery({
    queryKey: ["map-locations", postType ?? "all", cacheKey],
    queryFn: async () => {
      if (!bounds) return [];

      // Check IndexedDB first
      if (cacheKey) {
        const cached = await getCachedLocations(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Fetch from API
      const data = await fetchViewportLocations(bounds, postType);

      // Cache to IndexedDB
      if (cacheKey) {
        await setCachedLocations(cacheKey, data);
      }

      return data;
    },
    enabled: enabled && bounds !== null,
    staleTime,
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Prefetch adjacent viewports for smoother panning
  const prefetchAdjacent = () => {
    if (!bounds) return;

    const latSpan = bounds.north - bounds.south;
    const lngSpan = bounds.east - bounds.west;

    // Define adjacent viewport offsets
    const offsets = [
      { lat: latSpan, lng: 0 }, // North
      { lat: -latSpan, lng: 0 }, // South
      { lat: 0, lng: lngSpan }, // East
      { lat: 0, lng: -lngSpan }, // West
    ];

    offsets.forEach(({ lat, lng }) => {
      const adjacentBounds: ViewportBounds = {
        north: bounds.north + lat,
        south: bounds.south + lat,
        east: bounds.east + lng,
        west: bounds.west + lng,
      };

      const adjacentKey = generateViewportCacheKey(adjacentBounds, postType);

      queryClient.prefetchQuery({
        queryKey: ["map-locations", postType ?? "all", adjacentKey],
        queryFn: () => fetchViewportLocations(adjacentBounds, postType),
        staleTime,
      });
    });
  };

  return {
    locations: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => query.refetch(),
    prefetchAdjacent,
  };
}

/**
 * Invalidate all viewport location caches
 */
export function useInvalidateViewportLocations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["map-locations"] });
  };
}
