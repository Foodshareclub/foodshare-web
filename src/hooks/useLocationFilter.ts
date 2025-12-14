/**
 * useLocationFilter Hook
 *
 * Combines browser geolocation with UI store for location-based filtering.
 * Provides a unified interface for requesting location and filtering posts.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useUIStore } from "@/store/zustand/useUIStore";
import { usePosition } from "@/hooks/usePosition";

export interface LocationFilterState {
  // Current location (from store or browser)
  latitude: number | null;
  longitude: number | null;
  // Filter radius in meters
  radiusMeters: number;
  // Whether location filtering is enabled
  isEnabled: boolean;
  // Loading state
  isLoading: boolean;
  // Error state
  error: string | null;
  // Accuracy level
  accuracyLevel: "precise" | "approximate" | "city-level" | null;
}

export interface UseLocationFilterReturn extends LocationFilterState {
  // Request browser location
  requestLocation: () => void;
  // Enable/disable location filtering
  setEnabled: (enabled: boolean) => void;
  // Set filter radius (in km for UI, stored as meters)
  setRadiusKm: (km: number) => void;
  // Clear location data
  clearLocation: () => void;
  // Retry getting location
  retry: () => void;
}

// Default radius: 5km
const DEFAULT_RADIUS_KM = 5;
const KM_TO_METERS = 1000;

export function useLocationFilter(): UseLocationFilterReturn {
  const { userLocation, setUserLocation, clearUserLocation, geoDistance, setGeoDistance } =
    useUIStore();

  const [isEnabled, setIsEnabled] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  // Use the position hook only when enabled and requested
  const {
    latitude: browserLat,
    longitude: browserLng,
    accuracy: _accuracy,
    accuracyLevel,
    error: positionError,
    isLoading: positionLoading,
    retry: retryPosition,
  } = usePosition(false, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes cache
    fallbackToApproximate: true,
  });

  // Sync browser location to store when available
  useEffect(() => {
    if (hasRequested && browserLat && browserLng && !positionError) {
      setUserLocation({ latitude: browserLat, longitude: browserLng });
    }
  }, [browserLat, browserLng, hasRequested, positionError, setUserLocation]);

  // Initialize radius from store or default
  useEffect(() => {
    if (geoDistance === null) {
      setGeoDistance(DEFAULT_RADIUS_KM * KM_TO_METERS);
    }
  }, [geoDistance, setGeoDistance]);

  const requestLocation = useCallback(() => {
    setHasRequested(true);
    setIsEnabled(true);
    retryPosition();
  }, [retryPosition]);

  const handleSetEnabled = useCallback(
    (enabled: boolean) => {
      setIsEnabled(enabled);
      if (enabled && !userLocation && !hasRequested) {
        requestLocation();
      }
    },
    [userLocation, hasRequested, requestLocation]
  );

  const setRadiusKm = useCallback(
    (km: number) => {
      const clampedKm = Math.min(Math.max(km, 1), 100);
      setGeoDistance(clampedKm * KM_TO_METERS);
    },
    [setGeoDistance]
  );

  const clearLocation = useCallback(() => {
    clearUserLocation();
    setIsEnabled(false);
    setHasRequested(false);
  }, [clearUserLocation]);

  const retry = useCallback(() => {
    setHasRequested(true);
    retryPosition();
  }, [retryPosition]);

  // Derive current location (prefer store, fallback to browser)
  const latitude = userLocation?.latitude ?? (hasRequested ? browserLat : null) ?? null;
  const longitude = userLocation?.longitude ?? (hasRequested ? browserLng : null) ?? null;

  // Derive error message
  const error = positionError?.userFriendlyMessage ?? null;

  // Derive loading state
  const isLoading = hasRequested && positionLoading && !latitude;

  return {
    latitude,
    longitude,
    radiusMeters: geoDistance ?? DEFAULT_RADIUS_KM * KM_TO_METERS,
    isEnabled: isEnabled && latitude !== null && longitude !== null,
    isLoading,
    error,
    accuracyLevel: accuracyLevel ?? null,
    requestLocation,
    setEnabled: handleSetEnabled,
    setRadiusKm,
    clearLocation,
    retry,
  };
}
