/**
 * Dynamic Map Center Hook (Zero-Hardcoding Architecture)
 *
 * Resolves map center dynamically from server-provided location, the unified
 * user location store, browser cookie, device geolocation, or dynamic IP
 * approximation — without static city tables or blocking GPS timeouts.
 */

import {
  type ApproximateLocation,
  LOCATION_COOKIE_MAX_AGE,
  LOCATION_COOKIE_NAME,
  isStaleFallbackLocation,
  parseLocationCookie,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";
import { type Coordinates as StoreCoordinates, useUIStore } from "@/store/zustand/useUIStore";
import { useEffect, useRef, useState } from "react";

type Coordinates = [number, number];

interface MapCenterResult {
  center: Coordinates;
  isLoading: boolean;
  isUserLocation: boolean;
}

export const GLOBAL_NEUTRAL_CENTER: Coordinates = [20.0, 0.0];

function persistMapLocationCookie(coords: StoreCoordinates) {
  if (typeof document === "undefined") return;
  const approxLoc: ApproximateLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    city: coords.city,
    country: coords.country,
    source: coords.source || "ip",
    approximate: Boolean(coords.approximate),
  };
  const serialized = serializeLocationCookie(approxLoc);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCATION_COOKIE_NAME}=${serialized}; path=/; max-age=${LOCATION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export const useDefaultMapCenter = (initialLocation?: StoreCoordinates | null): MapCenterResult => {
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);

  const validStoreLocation = userLocation && !isStaleFallbackLocation(userLocation) ? userLocation : null;
  const validInitialLocation = initialLocation && !isStaleFallbackLocation(initialLocation) ? initialLocation : null;
  const seedLocation = validStoreLocation || validInitialLocation;

  const [center, setCenter] = useState<Coordinates>(
    seedLocation ? [seedLocation.latitude, seedLocation.longitude] : GLOBAL_NEUTRAL_CENTER,
  );
  const [isLoading, setIsLoading] = useState(!seedLocation);
  const [isUserLocation, setIsUserLocation] = useState(Boolean(seedLocation && seedLocation.source === "gps"));

  const gpsAcquiredRef = useRef(Boolean(seedLocation && seedLocation.source === "gps"));
  const resolvedOnceRef = useRef(false);

  useEffect(() => {
    if (validStoreLocation) {
      setCenter([validStoreLocation.latitude, validStoreLocation.longitude]);
      setIsUserLocation(validStoreLocation.source === "gps");
      if (validStoreLocation.source === "gps") {
        gpsAcquiredRef.current = true;
      }
      setIsLoading(false);
      return;
    }

    if (resolvedOnceRef.current) return;
    resolvedOnceRef.current = true;

    if (validInitialLocation) {
      setUserLocation(validInitialLocation);
      setCenter([validInitialLocation.latitude, validInitialLocation.longitude]);
      setIsUserLocation(validInitialLocation.source === "gps");
      setIsLoading(false);
      return;
    }

    // 2. Check document cookie
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )user-location=([^;]*)/);
      if (match) {
        const cookieLoc = parseLocationCookie(match[1]);
        if (cookieLoc && !isStaleFallbackLocation(cookieLoc)) {
          const parsedCoords: StoreCoordinates = {
            latitude: cookieLoc.latitude,
            longitude: cookieLoc.longitude,
            city: cookieLoc.city,
            country: cookieLoc.country,
            source: cookieLoc.source,
            approximate: cookieLoc.approximate,
          };
          setUserLocation(parsedCoords);
          setCenter([cookieLoc.latitude, cookieLoc.longitude]);
          setIsUserLocation(cookieLoc.source === "gps");
          setIsLoading(false);
          return;
        }
      }
    }

    const resolveIpCenter = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`/api/location/approximate?timezone=${encodeURIComponent(tz)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data.location && !gpsAcquiredRef.current) {
          const ipCoords: StoreCoordinates = {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            city: data.location.city,
            country: data.location.country,
            source: "ip",
            approximate: true,
          };
          setCenter([ipCoords.latitude, ipCoords.longitude]);
          setIsUserLocation(false);
          setUserLocation(ipCoords);
          persistMapLocationCookie(ipCoords);
        }
      } catch {
        // Keep current center
      } finally {
        setIsLoading(false);
      }
    };

    const resolveWithPermissions = async () => {
      let state: PermissionState | "unknown" = "unknown";
      if (typeof navigator !== "undefined" && "permissions" in navigator && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          state = perm.state;
        } catch {
          state = "unknown";
        }
      }

      if (state === "denied" || typeof navigator === "undefined" || !("geolocation" in navigator)) {
        await resolveIpCenter();
        return;
      }

      // Optimistic parallel IP fetch so the map never stalls for 4-10s waiting on GPS prompt/timeout
      const ipTask = resolveIpCenter();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          gpsAcquiredRef.current = true;
          const gpsCoords: StoreCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: "gps",
            approximate: false,
          };
          setCenter([gpsCoords.latitude, gpsCoords.longitude]);
          setIsUserLocation(true);
          setUserLocation(gpsCoords);
          persistMapLocationCookie(gpsCoords);
          setIsLoading(false);
        },
        () => {
          // IP fallback already ran in parallel
          void ipTask;
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        },
      );

      await ipTask;
    };

    void resolveWithPermissions();
  }, [validStoreLocation, validInitialLocation, setUserLocation]);

  return { center, isLoading, isUserLocation };
};
