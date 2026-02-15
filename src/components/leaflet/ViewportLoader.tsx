"use client";

/**
 * ViewportLoader - Fetches map markers based on current viewport bounds
 * Debounces viewport changes to avoid excessive server calls
 */

import { useEffect, useRef, useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import { fetchMapLocationsByBounds, type MapBounds } from "@/app/actions/map";
import type { LocationType } from "@/types/product.types";

interface ViewportLoaderProps {
  productType: string;
  onLocationsLoaded: (locations: LocationType[]) => void;
}

const ViewportLoader: React.FC<ViewportLoaderProps> = ({
  productType,
  onLocationsLoaded,
}) => {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string>("");

  const loadLocations = useCallback(
    async (bounds: MapBounds) => {
      // Deduplicate: skip if bounds haven't meaningfully changed
      const boundsKey = [
        bounds.north.toFixed(3),
        bounds.south.toFixed(3),
        bounds.east.toFixed(3),
        bounds.west.toFixed(3),
      ].join(",");

      if (boundsKey === lastBoundsRef.current) return;
      lastBoundsRef.current = boundsKey;

      const locations = await fetchMapLocationsByBounds(bounds, productType);
      onLocationsLoaded(locations);
    },
    [productType, onLocationsLoaded]
  );

  const map = useMapEvents({
    moveend() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const mapBounds = map.getBounds();
        loadLocations({
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          east: mapBounds.getEast(),
          west: mapBounds.getWest(),
        });
      }, 300);
    },
  });

  // Load locations on initial mount using current map bounds
  useEffect(() => {
    // Small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      const mapBounds = map.getBounds();
      loadLocations({
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
    };
  }, [map, loadLocations]);

  return null;
};

export default ViewportLoader;
