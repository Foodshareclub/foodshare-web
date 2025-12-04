/**
 * Map Position Persistence Hook
 * Remembers user's last map position and category for seamless navigation
 * Best practice: Cache with TTL to prevent stale positions
 */

import { useState, useEffect, useCallback } from "react";

type Coordinates = [number, number];

interface MapPosition {
  center: Coordinates;
  zoom: number;
  category: string;
  timestamp: number;
}

interface UseMapPositionOptions {
  category: string;
  defaultCenter: Coordinates;
  defaultZoom: number;
}

interface UseMapPositionResult {
  savedPosition: MapPosition | null;
  savePosition: (center: Coordinates, zoom: number) => void;
  clearPosition: () => void;
  hasSavedPosition: boolean;
}

const STORAGE_KEY = "foodshare_map_position";
const POSITION_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached map position for a specific category
 */
const getCachedPosition = (category: string): MapPosition | null => {
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY}_${category}`);
    if (!cached) return null;

    const position: MapPosition = JSON.parse(cached);
    const age = Date.now() - position.timestamp;

    // Expire after TTL
    if (age > POSITION_TTL) {
      localStorage.removeItem(`${STORAGE_KEY}_${category}`);
      return null;
    }

    // Validate position data
    if (
      !position.center ||
      !Array.isArray(position.center) ||
      position.center.length !== 2 ||
      typeof position.zoom !== "number"
    ) {
      return null;
    }

    return position;
  } catch (error) {
    console.warn("Failed to read cached map position:", error);
    return null;
  }
};

/**
 * Hook for map position persistence
 * Remembers where the user was on the map for each category
 */
export const useMapPosition = (options: UseMapPositionOptions): UseMapPositionResult => {
  const { category, defaultCenter, defaultZoom } = options;

  const [savedPosition, setSavedPosition] = useState<MapPosition | null>(() =>
    getCachedPosition(category)
  );

  // Load saved position when category changes
  useEffect(() => {
    const cached = getCachedPosition(category);
    setSavedPosition(cached);
  }, [category]);

  // Save position to localStorage
  const savePosition = useCallback(
    (center: Coordinates, zoom: number) => {
      try {
        const position: MapPosition = {
          center,
          zoom,
          category,
          timestamp: Date.now(),
        };

        localStorage.setItem(`${STORAGE_KEY}_${category}`, JSON.stringify(position));
        setSavedPosition(position);
      } catch (error) {
        console.warn("Failed to save map position:", error);
      }
    },
    [category]
  );

  // Clear saved position for current category
  const clearPosition = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${category}`);
      setSavedPosition(null);
    } catch (error) {
      console.warn("Failed to clear map position:", error);
    }
  }, [category]);

  return {
    savedPosition,
    savePosition,
    clearPosition,
    hasSavedPosition: savedPosition !== null,
  };
};

/**
 * Clear all saved map positions (useful for logout/reset)
 */
export const clearAllMapPositions = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear all map positions:", error);
  }
};
