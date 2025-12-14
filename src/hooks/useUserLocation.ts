/**
 * useUserLocation Hook
 *
 * Client-side hook for managing user geolocation.
 * Integrates with the browser Geolocation API and Zustand store.
 *
 * NOTE: This hook is for UI state only (location detection).
 * Data fetching should happen in Server Components using lib/data functions.
 *
 * Usage pattern:
 * 1. Client Component uses this hook to get user location
 * 2. Location is passed to Server Component via URL params or form action
 * 3. Server Component fetches nearby posts using lib/data/nearby-posts.ts
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useUIStore, selectUserLocation } from "@/store/zustand/useUIStore";

// ============================================================================
// Types
// ============================================================================

/** Coordinates format used by nearby-posts data layer */
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UseUserLocationReturn {
  /** User's current location (normalized to lat/lng format) */
  location: Coordinates | null;
  /** Whether location is being determined */
  isLocating: boolean;
  /** Location error message */
  error: string | null;
  /** Request user's location */
  requestLocation: () => void;
  /** Clear stored location */
  clearLocation: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useUserLocation(): UseUserLocationReturn {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get/set user location from Zustand store (uses latitude/longitude format)
  const storeLocation = useUIStore(selectUserLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);
  const clearUserLocation = useUIStore((state) => state.clearUserLocation);

  // Normalize store format (latitude/longitude) to data layer format (lat/lng)
  const location = useMemo<Coordinates | null>(() => {
    if (!storeLocation) return null;
    return {
      lat: storeLocation.latitude,
      lng: storeLocation.longitude,
    };
  }, [storeLocation]);

  const requestLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Store in Zustand format (latitude/longitude)
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        let message = "Unable to get your location";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = "Location access denied. Please enable location permissions.";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Location information unavailable.";
            break;
          case err.TIMEOUT:
            message = "Location request timed out.";
            break;
        }
        setError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, [setUserLocation]);

  const clearLocation = useCallback(() => {
    clearUserLocation();
    setError(null);
  }, [clearUserLocation]);

  return {
    location,
    isLocating,
    error,
    requestLocation,
    clearLocation,
  };
}

export default useUserLocation;
