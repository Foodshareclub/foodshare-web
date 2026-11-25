"use client";

import { useUIStore } from "@/store/zustand/useUIStore";
import { type Icon, type IconOptions, type LatLng, latLng } from "leaflet";
import { Loader2, MapPin, X } from "lucide-react";
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, FeatureGroup, Marker, Popup, useMapEvents } from "react-leaflet";

type LocationMarkerType = {
  icon: Icon<IconOptions>;
};

const UserLocationMarker: FC<LocationMarkerType> = ({ icon }) => {
  const fillRedOptions = { fillColor: "#E53E3E", color: "#E53E3E" };
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);

  const [position, setPosition] = useState<LatLng | null>(() =>
    userLocation && userLocation.source === "gps" ? latLng(userLocation.latitude, userLocation.longitude) : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAsked, setHasAsked] = useState(false);
  const manualRequestRef = useRef(false);

  useEffect(() => {
    if (userLocation && userLocation.source === "gps") {
      setPosition(latLng(userLocation.latitude, userLocation.longitude));
      setError(null);
    }
  }, [userLocation]);

  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      setIsLoading(false);
      setError(null);
      setUserLocation({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        source: "gps",
        approximate: false,
      });
      if (manualRequestRef.current) {
        map.flyTo(e.latlng, Math.max(map.getZoom(), 13));
      }
      manualRequestRef.current = false;
    },
    locationerror(e) {
      setIsLoading(false);
      // Only show error toast if the user explicitly clicked "Locate Me"
      if (manualRequestRef.current) {
        setError(e.message || "Unable to get your location");
      }
      manualRequestRef.current = false;
      console.info("[UserLocationMarker] Geolocation unavailable:", e.message);
    },
  });

  const triggerLocate = useCallback(
    (manual: boolean) => {
      manualRequestRef.current = manual;
      setIsLoading(true);
      setError(null);
      if (manual) setHasAsked(true);
      map.locate({
        setView: false,
        maxZoom: 14,
        enableHighAccuracy: manual,
        timeout: manual ? 8000 : 5000,
        maximumAge: 300000,
      });
    },
    [map],
  );

  // Silently sync GPS marker on mount ONLY if geolocation permission is already granted
  useEffect(() => {
    if (userLocation?.source === "gps") return;

    let cancelled = false;
    const syncIfGranted = async () => {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (!cancelled && perm.state === "granted") {
          triggerLocate(false);
        }
      } catch {
        // Ignore Permissions API errors
      }
    };

    void syncIfGranted();
    return () => {
      cancelled = true;
    };
  }, [triggerLocate, userLocation?.source]);

  return (
    <>
      {/* Location marker and circle */}
      {position && (
        <FeatureGroup pathOptions={fillRedOptions}>
          <Marker icon={icon} position={position}>
            <Popup>
              <div className="flex flex-col gap-1 items-start">
                <p className="flex items-center gap-1 font-semibold text-sm">
                  <MapPin className="text-red-500" />
                  Your location
                </p>
                <p className="text-xs text-muted-foreground">
                  {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
          <Circle center={position} radius={1000} />
        </FeatureGroup>
      )}

      {/* Locate Me Button */}
      <div className="fixed bottom-20 md:bottom-8 end-4 z-40">
        <button
          type="button"
          onClick={() => triggerLocate(true)}
          disabled={isLoading}
          className={`
            flex items-center gap-1.5 px-3 py-2 text-sm rounded-full shadow-md
            transition-all duration-200 cursor-pointer
            ${
              error
                ? "bg-red-500 hover:bg-red-600"
                : position
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-500 hover:bg-blue-600"
            }
            text-white
            hover:scale-105 hover:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Finding...
            </>
          ) : error ? (
            <>
              <X />
              Retry
            </>
          ) : position ? (
            <>
              <MapPin />
              Located
            </>
          ) : (
            <>
              <MapPin />
              Locate Me
            </>
          )}
        </button>

        {/* Error message */}
        {error && hasAsked && (
          <div className="mt-2 bg-popover p-3 rounded-lg shadow-sm max-w-[250px] border border-border">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Please enable location access in your browser settings</p>
          </div>
        )}
      </div>
    </>
  );
};

export default UserLocationMarker;
