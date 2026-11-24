"use client";

import {
  type ApproximateLocation,
  LOCATION_COOKIE_MAX_AGE,
  LOCATION_COOKIE_NAME,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";
import { type Coordinates, useUIStore } from "@/store/zustand/useUIStore";
import { useCallback, useEffect, useRef, useState } from "react";

export type LocationResolutionStatus = "idle" | "resolving" | "ready" | "error";

interface UseLocationResolverOptions {
  initialLocation?: Coordinates | null;
  autoResolve?: boolean;
}

interface UseLocationResolverReturn {
  location: Coordinates | null;
  status: LocationResolutionStatus;
  permissionState: PermissionState | "unknown";
  isApproximate: boolean;
  requestPreciseLocation: () => Promise<Coordinates | null>;
}

/**
 * Persists location to document cookie for SSR consistency
 */
function persistLocationCookie(coords: Coordinates) {
  if (typeof document === "undefined") return;

  const approxLoc: ApproximateLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    city: coords.city,
    country: coords.country,
    source: coords.source || "gps",
    approximate: Boolean(coords.approximate),
  };

  const serialized = serializeLocationCookie(approxLoc);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCATION_COOKIE_NAME}=${serialized}; path=/; max-age=${LOCATION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * Hook to resolve and pinpoint user location:
 * 1. Checks browser permissions.
 * 2. If 'granted', silently obtains GPS coordinates.
 * 3. If 'prompt', requests geolocation to ask for access.
 * 4. If refused ('denied' or error), falls back immediately to IP approximation.
 */
export function useLocationResolver(options: UseLocationResolverOptions = {}): UseLocationResolverReturn {
  const { initialLocation = null, autoResolve = true } = options;
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);

  const [location, setLocation] = useState<Coordinates | null>(initialLocation || userLocation);
  const [status, setStatus] = useState<LocationResolutionStatus>(location ? "ready" : "idle");
  const [permissionState, setPermissionState] = useState<PermissionState | "unknown">("unknown");
  const isResolvingRef = useRef(false);

  // Sync with Zustand if updated externally
  useEffect(() => {
    if (userLocation) {
      setLocation(userLocation);
      setStatus("ready");
    }
  }, [userLocation]);

  /**
   * Fetch approximate location via IP endpoint
   */
  const resolveIpApproximation = useCallback(async (): Promise<Coordinates | null> => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/location/approximate?timezone=${encodeURIComponent(tz)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.success && data.location) {
        const approxCoords: Coordinates = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          city: data.location.city,
          country: data.location.country,
          source: "ip",
          approximate: true,
        };
        setUserLocation(approxCoords);
        setLocation(approxCoords);
        persistLocationCookie(approxCoords);
        setStatus("ready");
        return approxCoords;
      }
    } catch (err) {
      console.warn("[LocationResolver] Failed to resolve IP approximate location:", err);
    }
    return null;
  }, [setUserLocation]);

  /**
   * Request precise location via browser geolocation
   */
  const requestPreciseLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      return resolveIpApproximation();
    }

    setStatus("resolving");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const preciseCoords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: "gps",
            approximate: false,
          };
          setUserLocation(preciseCoords);
          setLocation(preciseCoords);
          persistLocationCookie(preciseCoords);
          setStatus("ready");
          resolve(preciseCoords);
        },
        async (error) => {
          console.info("[LocationResolver] Geolocation refused or failed, using IP approximation:", error.message);
          // If denied (code 1) or timed out/unavailable, immediately fall back to IP approximation
          const fallback = await resolveIpApproximation();
          resolve(fallback);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000, // 5 minute cache
        },
      );
    });
  }, [resolveIpApproximation, setUserLocation]);

  // Main resolution lifecycle on mount
  useEffect(() => {
    if (!autoResolve || isResolvingRef.current) return;
    isResolvingRef.current = true;

    async function checkPermissionAndResolve() {
      let state: PermissionState | "unknown" = "unknown";

      if (typeof navigator !== "undefined" && "permissions" in navigator && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          state = status.state;
          setPermissionState(state);

          // Listen for permission changes (e.g. user toggles permission in browser bar)
          status.onchange = () => {
            setPermissionState(status.state);
            if (status.state === "granted") {
              requestPreciseLocation();
            } else if (status.state === "denied") {
              resolveIpApproximation();
            }
          };
        } catch {
          state = "unknown";
        }
      }

      // If user already has a recent location in memory/cookie, prioritize it
      if (userLocation) {
        setStatus("ready");
        return;
      }

      if (state === "granted") {
        // Silently obtain GPS coordinates
        await requestPreciseLocation();
      } else if (state === "prompt" || state === "unknown") {
        // Access is not given yet: ask for access
        await requestPreciseLocation();
      } else if (state === "denied") {
        // Refused: do not spam getCurrentPosition, fall back immediately to IP approximation
        await resolveIpApproximation();
      }
    }

    checkPermissionAndResolve();
  }, [autoResolve, userLocation, requestPreciseLocation, resolveIpApproximation]);

  const isApproximate = Boolean(location?.approximate || location?.source === "ip");

  return {
    location,
    status,
    permissionState,
    isApproximate,
    requestPreciseLocation,
  };
}
