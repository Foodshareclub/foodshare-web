import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// Types
export type AccuracyLevel = "precise" | "approximate" | "city-level";

export interface PositionData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number;
  accuracyLevel?: AccuracyLevel;
}

export interface PositionError {
  code: number;
  message: string;
  userFriendlyMessage: string;
}

export interface UsePositionSettings {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToApproximate?: boolean; // New: Enable fallback strategy
}

export interface UsePositionReturn extends PositionData {
  error: PositionError | null;
  isLoading: boolean;
  retry: () => void;
}

const defaultSettings: UsePositionSettings = {
  enableHighAccuracy: false,
  timeout: 10000, // 10 seconds instead of Infinity
  maximumAge: 300000, // Cache for 5 minutes
  fallbackToApproximate: true, // Enable fallback by default
};

// Helper to determine accuracy level
const getAccuracyLevel = (accuracy: number): AccuracyLevel => {
  if (accuracy < 50) return "precise"; // ~50m or better
  if (accuracy < 1000) return "approximate"; // ~1km
  return "city-level"; // IP-based or very approximate
};

// Helper to get user-friendly error messages
const getUserFriendlyError = (error: GeolocationPositionError): PositionError => {
  const errorMessages: Record<number, string> = {
    1: "Location access was denied. Please enable location permissions in your browser settings to see nearby listings.",
    2: "Unable to determine your location. Please check your device's location settings.",
    3: "Location request timed out. Please try again.",
  };

  return {
    code: error.code,
    message: error.message,
    userFriendlyMessage:
      errorMessages[error.code] ||
      "Unable to get your location. You can still browse listings or enter your location manually.",
  };
};

export const usePosition = (
  watch = false,
  userSettings: UsePositionSettings = {}
): UsePositionReturn => {
  /* eslint-disable react-hooks/exhaustive-deps */
  const settings = useMemo(
    () => ({
      ...defaultSettings,
      ...userSettings,
    }),
    [
      userSettings.enableHighAccuracy,
      userSettings.timeout,
      userSettings.maximumAge,
      userSettings.fallbackToApproximate,
    ]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  const [position, setPosition] = useState<PositionData>({});
  const [error, setError] = useState<PositionError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasTriedFallback = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const onChange = useCallback(({ coords, timestamp }: GeolocationPosition) => {
    const accuracyLevel = getAccuracyLevel(coords.accuracy);

    setPosition({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      heading: coords.heading,
      timestamp,
      accuracyLevel,
    });
    setError(null);
    setIsLoading(false);
    hasTriedFallback.current = false; // Reset for next request
  }, []);

  const onError = useCallback(
    (geolocationError: GeolocationPositionError) => {
      const friendlyError = getUserFriendlyError(geolocationError);

      // Fallback strategy: If high accuracy fails and fallback is enabled, try approximate
      if (
        settings.fallbackToApproximate &&
        settings.enableHighAccuracy &&
        !hasTriedFallback.current
      ) {
        hasTriedFallback.current = true;

        // Try again with low accuracy
        const fallbackSettings: PositionOptions = {
          enableHighAccuracy: false,
          timeout: settings.timeout,
          maximumAge: settings.maximumAge,
        };

        navigator.geolocation.getCurrentPosition(
          onChange,
          (fallbackError) => {
            // Both attempts failed
            setError(getUserFriendlyError(fallbackError));
            setIsLoading(false);
          },
          fallbackSettings
        );
      } else {
        setError(friendlyError);
        setIsLoading(false);
      }
    },
    [settings, onChange]
  );

  const requestPosition = useCallback(() => {
    if (!navigator?.geolocation) {
      setError({
        code: 0,
        message: "Geolocation is not supported",
        userFriendlyMessage:
          "Your browser doesn't support location services. Please enter your location manually.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    hasTriedFallback.current = false;

    const positionOptions: PositionOptions = {
      enableHighAccuracy: settings.enableHighAccuracy,
      timeout: settings.timeout,
      maximumAge: settings.maximumAge,
    };

    if (watch) {
      // Clear existing watcher if any
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(onChange, onError, positionOptions);
    } else {
      navigator.geolocation.getCurrentPosition(onChange, onError, positionOptions);
    }
  }, [watch, settings, onChange, onError]);

  useEffect(() => {
    requestPosition();

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestPosition]);

  return {
    ...position,
    error,
    isLoading,
    retry: requestPosition,
  };
};
