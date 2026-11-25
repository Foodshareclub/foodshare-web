"use client";

import {
  type ApproximateLocation,
  LOCATION_COOKIE_MAX_AGE,
  LOCATION_COOKIE_NAME,
  isStaleFallbackLocation,
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
 * Hook to resolve and pinpoint user location using web best practices:
 * 1. Checks browser permissions via Permissions API.
 * 2. If 'granted', silently obtains GPS coordinates.
 * 3. If 'prompt' or 'unknown', optimistically resolves dynamic IP approximation
 *    in parallel so the feed paints immediately, while asking the user for GPS access.
 * 4. If refused ('denied' or error), uses dynamic IP approximation silently without nagging.
 * 5. Never uses hardcoded coordinate fallbacks; automatically discards stale Berlin artifacts.
 */
export function useLocationResolver(options: UseLocationResolverOptions = {}): UseLocationResolverReturn {
  const { initialLocation = null, autoResolve = true } = options;
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);

  const initialIsStale = isStaleFallbackLocation(initialLocation) || isStaleFallbackLocation(userLocation);

  const effectiveInitial = initialIsStale ? null : initialLocation || userLocation;
  const [location, setLocation] = useState<Coordinates | null>(effectiveInitial);
  const [status, setStatus] = useState<LocationResolutionStatus>(effectiveInitial ? "ready" : "idle");
  const [permissionState, setPermissionState] = useState<PermissionState | "unknown">("unknown");

  const isResolvingRef = useRef(false);
  const gpsAcquiredRef = useRef(effectiveInitial?.source === "gps");
  const ipPromiseRef = useRef<Promise<Coordinates | null> | null>(null);

  // Sync with Zustand if updated externally
  useEffect(() => {
    if (userLocation && !isStaleFallbackLocation(userLocation)) {
      setLocation(userLocation);
      setStatus("ready");
    }
  }, [userLocation]);

  /**
   * Fetch approximate location via dynamic IP endpoint (deduped per hook instance)
   */
  const resolveIpApproximation = useCallback(
    async (forceRefresh = false): Promise<Coordinates | null> => {
      // Never downgrade precise GPS coordinates to approximate IP
      if (gpsAcquiredRef.current) return null;

      if (!forceRefresh && ipPromiseRef.current) {
        return ipPromiseRef.current;
      }

      const promise = (async () => {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const res = await fetch(`/api/location/approximate?timezone=${encodeURIComponent(tz)}`, {
            cache: "no-store",
          });
          if (!res.ok) return null;
          const data = await res.json();
          if (data?.success && data.location) {
            // Re-check after async network round-trip in case GPS resolved first
            if (gpsAcquiredRef.current) return null;

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
      })();

      ipPromiseRef.current = promise;
      return promise;
    },
    [setUserLocation],
  );

  /**
   * Request precise location via browser geolocation
   */
  const requestPreciseLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      return resolveIpApproximation();
    }

    // Preserve resolving state only if we don't already have an approximate location ready
    setStatus((prev) => (prev === "ready" ? "ready" : "resolving"));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          gpsAcquiredRef.current = true;
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
          // If denied (code 1) or timed out/unavailable, immediately ensure IP approximation is active
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
          const permStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          state = permStatus.state;
          setPermissionState(state);

          // Listen for permission changes (e.g. user toggles permission in browser bar)
          permStatus.onchange = () => {
            setPermissionState(permStatus.state);
            if (permStatus.state === "granted") {
              requestPreciseLocation();
            } else if (permStatus.state === "denied") {
              gpsAcquiredRef.current = false;
              resolveIpApproximation(true);
            }
          };
        } catch {
          state = "unknown";
        }
      }

      const isStale = isStaleFallbackLocation(userLocation) || isStaleFallbackLocation(initialLocation);

      // Hydrate store from valid server-resolved location when store is empty or stale
      if (
        initialLocation &&
        !isStaleFallbackLocation(initialLocation) &&
        (!userLocation || isStaleFallbackLocation(userLocation))
      ) {
        setUserLocation(initialLocation);
      }

      // If user has a valid, non-stale precise location, keep it
      if (userLocation && !isStale && userLocation.source === "gps") {
        gpsAcquiredRef.current = true;
        setStatus("ready");
        return;
      }

      // If user already has a recent non-stale approximate location and permission is denied, keep it
      if ((userLocation || initialLocation) && !isStale && state === "denied") {
        setStatus("ready");
        return;
      }

      if (state === "granted") {
        // Silently obtain GPS coordinates
        await requestPreciseLocation();
      } else if (state === "prompt" || state === "unknown") {
        // Optimistic parallel resolution: paint IP-based local feed immediately while asking for GPS
        await Promise.all([
          !effectiveInitial || isStale ? resolveIpApproximation() : Promise.resolve(effectiveInitial),
          requestPreciseLocation(),
        ]);
      } else if (state === "denied") {
        // Refused: do not spam getCurrentPosition, fall back immediately to IP approximation
        await resolveIpApproximation();
      } else if (isStale) {
        // Stale fallback detected: force fresh resolution
        await resolveIpApproximation(true);
      }
    }

    checkPermissionAndResolve();
  }, [
    autoResolve,
    effectiveInitial,
    initialLocation,
    userLocation,
    setUserLocation,
    requestPreciseLocation,
    resolveIpApproximation,
  ]);

  const isApproximate = Boolean(location?.approximate || location?.source === "ip");

  return {
    location,
    status,
    permissionState,
    isApproximate,
    requestPreciseLocation,
  };
}
