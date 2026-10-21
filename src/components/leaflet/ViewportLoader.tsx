"use client";

/**
 * ViewportLoader - Fetches map markers based on current viewport bounds.
 *
 * Requests a GET route handler rather than a Server Action. A Server Action is a
 * POST, and `src/proxy.ts` classifies every POST as a mutation with a
 * 30/minute budget and no path filter — so panning the map for ~10s returned
 * 429 and marker loading silently stopped. Reads must not spend the write
 * budget.
 *
 * Also handles the three failure modes the previous version did not:
 *   - out-of-order responses: an in-flight request is aborted and its result
 *     discarded when newer bounds arrive, so a slow response cannot overwrite a
 *     newer one;
 *   - network/HTTP errors: the previous version had no try/catch, so a rejection
 *     became an unhandled promise rejection, and the action's `return []` on
 *     error blanked every marker;
 *   - errors are surfaced as "keep current markers" rather than "no results".
 */

import type { LocationType } from "@/types/product.types";
import { useCallback, useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";

interface ViewportLoaderProps {
  productType: string;
  onLocationsLoaded: (locations: LocationType[]) => void;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const DEBOUNCE_MS = 300;
/** Bounds below this precision change are the same tile; skip the request. */
const BOUNDS_PRECISION = 3;

const ViewportLoader: React.FC<ViewportLoaderProps> = ({ productType, onLocationsLoaded }) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const loadLocations = useCallback(
    async (bounds: Bounds) => {
      // Deduplicate: skip if bounds haven't meaningfully changed
      const boundsKey = [
        bounds.north.toFixed(BOUNDS_PRECISION),
        bounds.south.toFixed(BOUNDS_PRECISION),
        bounds.east.toFixed(BOUNDS_PRECISION),
        bounds.west.toFixed(BOUNDS_PRECISION),
      ].join(",");

      if (boundsKey === lastBoundsRef.current) return;
      lastBoundsRef.current = boundsKey;

      // Cancel any request still in flight — its bounds are now stale.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
      });
      if (productType) params.set("type", productType);

      try {
        const response = await fetch(`/api/map/locations?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          // Keep the markers already on the map; a transient failure is not
          // evidence that the viewport is empty.
          console.error(`[ViewportLoader] ${response.status} from /api/map/locations — keeping current markers`);
          return;
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const locations = (data as { locations?: LocationType[] })?.locations;
        if (Array.isArray(locations)) {
          onLocationsLoaded(locations);
        }
      } catch (error) {
        // An abort is the expected outcome of a superseded request.
        if (controller.signal.aborted) return;
        console.error("[ViewportLoader] Failed to load locations:", error);
      }
    },
    [productType, onLocationsLoaded],
  );

  const map = useMapEvents({
    moveend() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const mapBounds = map.getBounds();
        void loadLocations({
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          east: mapBounds.getEast(),
          west: mapBounds.getWest(),
        });
      }, DEBOUNCE_MS);
    },
  });

  // Load locations on initial mount using current map bounds
  useEffect(() => {
    // Small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      const mapBounds = map.getBounds();
      void loadLocations({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    };
  }, [map, loadLocations]);

  return null;
};

export default ViewportLoader;
