/**
 * Smart Map Zoom Management with Caching
 * Best practices: Context-aware defaults + User preference persistence
 */

import { useState, useEffect, useCallback } from "react";

interface ZoomConfig {
  minZoom: number;
  maxZoom: number;
  streetLevel: number;
  neighborhoodLevel: number;
  cityLevel: number;
  regionLevel: number;
}

const ZOOM_CONFIG: ZoomConfig = {
  minZoom: 2, // World view
  maxZoom: 18, // Building level
  streetLevel: 16, // See individual buildings
  neighborhoodLevel: 13, // See neighborhood details
  cityLevel: 11, // See city overview
  regionLevel: 8, // See region/state
};

const STORAGE_KEY = "foodshare_map_zoom_preference";

interface UseMapZoomOptions {
  isUserLocation: boolean;
  hasProducts: boolean;
  productCount?: number;
}

/**
 * Calculate optimal zoom based on context
 */
const getOptimalZoom = (options: UseMapZoomOptions): number => {
  const { isUserLocation, hasProducts, productCount = 0 } = options;

  // Priority 1: User's GPS location - show nearby items
  if (isUserLocation) {
    return ZOOM_CONFIG.neighborhoodLevel; // 13 - Can see items within walking distance
  }

  // Priority 2: Products available
  if (hasProducts) {
    // Many products: Zoom out to see distribution
    if (productCount > 50) {
      return ZOOM_CONFIG.cityLevel; // 11 - See all products
    }
    // Few products: Zoom in to see details
    if (productCount < 10) {
      return ZOOM_CONFIG.neighborhoodLevel; // 13 - See product details
    }
    // Medium amount: Balanced view
    return ZOOM_CONFIG.cityLevel + 1; // 12 - Balanced
  }

  // Priority 3: No location, no products - show region
  return ZOOM_CONFIG.regionLevel; // 8 - City/region view
};

/**
 * Hook for intelligent zoom management with caching
 */
export const useMapZoom = (options: UseMapZoomOptions) => {
  // Get cached zoom from localStorage
  const getCachedZoom = useCallback((): number | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const zoom = parseInt(cached, 10);
        if (zoom >= ZOOM_CONFIG.minZoom && zoom <= ZOOM_CONFIG.maxZoom) {
          return zoom;
        }
      }
    } catch (error) {
      console.warn("Failed to read cached zoom:", error);
    }
    return null;
  }, []);

  // Calculate optimal zoom based on context
  const optimalZoom = getOptimalZoom(options);

  // Use cached zoom if available, otherwise use optimal
  const [zoom, setZoom] = useState<number>(() => {
    const cached = getCachedZoom();
    return cached !== null ? cached : optimalZoom;
  });

  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Update zoom when context changes (only if user hasn't manually adjusted)
  useEffect(() => {
    if (!hasUserInteracted) {
      const cached = getCachedZoom();
      const newZoom = cached !== null ? cached : optimalZoom;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing zoom from localStorage/context changes
      setZoom(newZoom);
    }
  }, [optimalZoom, hasUserInteracted, getCachedZoom]);

  // Save zoom to cache when it changes
  const updateZoom = useCallback((newZoom: number, userInitiated: boolean = false) => {
    // Clamp zoom to valid range
    const clampedZoom = Math.max(ZOOM_CONFIG.minZoom, Math.min(ZOOM_CONFIG.maxZoom, newZoom));

    setZoom(clampedZoom);

    if (userInitiated) {
      setHasUserInteracted(true);
    }

    // Cache the zoom preference
    try {
      localStorage.setItem(STORAGE_KEY, clampedZoom.toString());
    } catch (error) {
      console.warn("Failed to cache zoom:", error);
    }
  }, []);

  // Reset to optimal zoom (useful for "reset view" functionality)
  const resetZoom = useCallback(() => {
    setHasUserInteracted(false);
    setZoom(optimalZoom);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear zoom cache:", error);
    }
  }, [optimalZoom]);

  return {
    zoom,
    optimalZoom,
    updateZoom,
    resetZoom,
    hasUserInteracted,
    zoomConfig: ZOOM_CONFIG,
  };
};
