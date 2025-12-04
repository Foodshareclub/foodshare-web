/**
 * Dynamic Map Center Hook
 * Best practice: Use user's geolocation with intelligent fallbacks
 */

import { useState, useEffect } from "react";
import { createLogger } from "@/lib/logger";

const logger = createLogger("MapCenter");

type Coordinates = [number, number];

interface MapCenterResult {
  center: Coordinates;
  isLoading: boolean;
  isUserLocation: boolean;
}

// Fallback locations based on timezone/locale
const getLocationFromTimezone = (): Coordinates => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Major timezone to coordinates mapping
  const timezoneMap: Record<string, Coordinates> = {
    // Americas
    "America/New_York": [40.7128, -74.0060],
    "America/Chicago": [41.8781, -87.6298],
    "America/Los_Angeles": [34.0522, -118.2437],
    "America/Toronto": [43.6532, -79.3832],
    "America/Mexico_City": [19.4326, -99.1332],
    "America/Sao_Paulo": [-23.5505, -46.6333],

    // Europe
    "Europe/London": [51.5074, -0.1278],
    "Europe/Paris": [48.8566, 2.3522],
    "Europe/Berlin": [52.5200, 13.4050],
    "Europe/Madrid": [40.4168, -3.7038],
    "Europe/Rome": [41.9028, 12.4964],
    "Europe/Amsterdam": [52.3676, 4.9041],
    "Europe/Prague": [50.0755, 14.4378],
    "Europe/Warsaw": [52.2297, 21.0122],

    // Asia
    "Asia/Tokyo": [35.6762, 139.6503],
    "Asia/Shanghai": [31.2304, 121.4737],
    "Asia/Hong_Kong": [22.3193, 114.1694],
    "Asia/Singapore": [1.3521, 103.8198],
    "Asia/Dubai": [25.2048, 55.2708],
    "Asia/Kolkata": [28.7041, 77.1025],

    // Oceania
    "Australia/Sydney": [-33.8688, 151.2093],
    "Pacific/Auckland": [-36.8485, 174.7633],
  };

  // Direct match
  if (timezoneMap[timezone]) {
    return timezoneMap[timezone];
  }

  // Partial match (e.g., Europe/Bucharest -> Europe/Prague)
  const region = timezone.split("/")[0];
  const regionDefaults: Record<string, Coordinates> = {
    "Europe": [50.0755, 14.4378], // Prague (central Europe)
    "America": [39.8283, -98.5795], // Geographic center of USA
    "Asia": [34.0479, 100.6197], // Geographic center of Asia
    "Africa": [0.0236, 37.9062], // Nairobi
    "Australia": [-25.2744, 133.7751], // Geographic center of Australia
    "Pacific": [-17.7134, 178.0650], // Fiji
  };

  return regionDefaults[region] || [20.0, 0.0]; // Equator as ultimate fallback
};

// Get location from browser's locale
const getLocationFromLocale = (): Coordinates => {
  const locale = navigator.language;
  const country = locale.split("-")[1] || locale;

  const localeMap: Record<string, Coordinates> = {
    US: [39.8283, -98.5795],
    GB: [51.5074, -0.1278],
    CA: [56.1304, -106.3468],
    AU: [-25.2744, 133.7751],
    DE: [51.1657, 10.4515],
    FR: [46.2276, 2.2137],
    ES: [40.4637, -3.7492],
    IT: [41.8719, 12.5674],
    NL: [52.1326, 5.2913],
    CZ: [50.0755, 14.4378],
    PL: [51.9194, 19.1451],
    JP: [36.2048, 138.2529],
    CN: [35.8617, 104.1954],
    IN: [20.5937, 78.9629],
    BR: [-14.2350, -51.9253],
  };

  return localeMap[country] || getLocationFromTimezone();
};

/**
 * Hook to get dynamic map center with best practices
 * Priority: User's geolocation > Timezone > Locale > Fallback
 */
export const useDefaultMapCenter = (): MapCenterResult => {
  const [center, setCenter] = useState<Coordinates>(() => getLocationFromLocale());
  const [isLoading, setIsLoading] = useState(true);
  const [isUserLocation, setIsUserLocation] = useState(false);

  useEffect(() => {
    // Try to get user's actual location
    if ("geolocation" in navigator) {
      const timeoutId = setTimeout(() => {
        // If geolocation takes too long, use fallback
        setIsLoading(false);
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          setCenter([position.coords.latitude, position.coords.longitude]);
          setIsUserLocation(true);
          setIsLoading(false);
        },
        (error) => {
          clearTimeout(timeoutId);
          logger.warn("Geolocation unavailable, using timezone/locale fallback", { error: error.message });
          // Keep the locale-based fallback
          setIsLoading(false);
        },
        {
          enableHighAccuracy: false, // Fast, low-accuracy is fine for city-level
          timeout: 3000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    } else {
      setIsLoading(false);
    }
  }, []);

  return { center, isLoading, isUserLocation };
};
