/**
 * Viewport Location Loader Component
 * Fetches locations based on current map viewport using PostGIS RPC
 * Enterprise-grade: Debounced fetching with IndexedDB caching
 */

"use client";

import { useEffect, useCallback } from "react";
import { useMap } from "react-leaflet";
import { useDebouncedViewport } from "@/hooks/useDebouncedViewport";
import { useViewportLocations } from "@/hooks/queries/useViewportLocations";
import type { LocationType } from "@/types/product.types";

interface ViewportLocationLoaderProps {
  /** Post type to filter by */
  postType: string;
  /** Initial locations from server (shown immediately) */
  initialLocations: LocationType[];
  /** Callback when locations are loaded */
  onLocationsLoaded: (locations: LocationType[]) => void;
  /** Whether viewport loading is enabled (default: true) */
  enabled?: boolean;
  /** Minimum zoom level to trigger viewport loading (default: 8) */
  minZoom?: number;
}

/**
 * Component that loads locations based on current map viewport
 * Must be used inside a MapContainer
 */
export function ViewportLocationLoader({
  postType,
  initialLocations,
  onLocationsLoaded,
  enabled = true,
  minZoom = 8,
}: ViewportLocationLoaderProps) {
  const map = useMap();

  // Get debounced viewport bounds
  const { bounds, zoom, isMoving } = useDebouncedViewport(map, {
    delay: 300, // 300ms debounce for smooth UX
    minZoom,
  });

  // Fetch locations for current viewport
  const { locations, isLoading, isFetching, prefetchAdjacent } = useViewportLocations(bounds, {
    postType,
    enabled: enabled && zoom >= minZoom,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Merge initial and viewport locations
  const mergeLocations = useCallback(
    (viewportLocations: LocationType[]): LocationType[] => {
      if (!viewportLocations.length) return initialLocations;

      // Create a Set of IDs for O(1) lookup
      const viewportIds = new Set(viewportLocations.map((l) => l.id));

      // Keep initial locations that aren't in viewport (for clusters outside viewport)
      const outsideViewport = initialLocations.filter((l) => !viewportIds.has(l.id));

      // Combine: viewport locations + locations outside viewport from initial data
      return [...viewportLocations, ...outsideViewport];
    },
    [initialLocations]
  );

  // Update parent with merged locations
  useEffect(() => {
    if (locations.length > 0) {
      const merged = mergeLocations(locations);
      onLocationsLoaded(merged);
    }
  }, [locations, mergeLocations, onLocationsLoaded]);

  // Prefetch adjacent viewports when user stops moving
  useEffect(() => {
    if (!isMoving && bounds && zoom >= minZoom) {
      // Delay prefetch to not compete with current viewport
      const timeout = setTimeout(() => {
        prefetchAdjacent();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [isMoving, bounds, zoom, minZoom, prefetchAdjacent]);

  // Optional: Show loading indicator (can be customized)
  if (isLoading && !initialLocations.length) {
    return null; // Parent will show loading state
  }

  // This component doesn't render anything visible
  // It just manages data fetching
  return null;
}

export default ViewportLocationLoader;
