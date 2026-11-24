/**
 * Dynamic Map Center Hook (Zero-Hardcoding Architecture)
 *
 * Resolves map center dynamically from the unified user location store,
 * device geolocation, or dynamic IP approximation without static city tables.
 */

import { parseLocationCookie } from "@/lib/location/approximate-location";
import { useUIStore } from "@/store/zustand/useUIStore";
import { useEffect, useState } from "react";

type Coordinates = [number, number];

interface MapCenterResult {
  center: Coordinates;
  isLoading: boolean;
  isUserLocation: boolean;
}

const GLOBAL_NEUTRAL_CENTER: Coordinates = [20.0, 0.0];

export const useDefaultMapCenter = (): MapCenterResult => {
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);

  const initialCenter: Coordinates = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : GLOBAL_NEUTRAL_CENTER;

  const [center, setCenter] = useState<Coordinates>(initialCenter);
  const [isLoading, setIsLoading] = useState(!userLocation);
  const [isUserLocation, setIsUserLocation] = useState(Boolean(userLocation && userLocation.source === "gps"));

  useEffect(() => {
    // 1. If Zustand already has a location, prioritize it
    if (userLocation) {
      setCenter([userLocation.latitude, userLocation.longitude]);
      setIsUserLocation(userLocation.source === "gps");
      setIsLoading(false);
      return;
    }

    // 2. Check document cookie
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )user-location=([^;]*)/);
      if (match) {
        const cookieLoc = parseLocationCookie(match[1]);
        if (cookieLoc) {
          setCenter([cookieLoc.latitude, cookieLoc.longitude]);
          setIsUserLocation(cookieLoc.source === "gps");
          setIsLoading(false);
          return;
        }
      }
    }

    // 3. Query device geolocation if available
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCenter([lat, lng]);
          setIsUserLocation(true);
          setIsLoading(false);
          setUserLocation({
            latitude: lat,
            longitude: lng,
            source: "gps",
            approximate: false,
          });
        },
        async () => {
          // 4. Geolocation refused or failed -> Dynamic IP approximation
          try {
            const res = await fetch("/api/location/approximate", { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (data?.success && data.location) {
                setCenter([data.location.latitude, data.location.longitude]);
                setIsUserLocation(false);
                setUserLocation({
                  latitude: data.location.latitude,
                  longitude: data.location.longitude,
                  city: data.location.city,
                  country: data.location.country,
                  source: "ip",
                  approximate: true,
                });
              }
            }
          } catch {
            // Keep neutral center
          } finally {
            setIsLoading(false);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 300000,
        },
      );
    } else {
      setIsLoading(false);
    }
  }, [userLocation, setUserLocation]);

  return { center, isLoading, isUserLocation };
};
