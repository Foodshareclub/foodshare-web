'use client';

import { Circle, FeatureGroup, Marker, Popup, useMapEvents } from "react-leaflet";
import type { FC } from "react";
import { useState, useEffect } from "react";
import type { Icon, IconOptions, LatLng } from "leaflet";
import { FaMapMarkerAlt, FaTimes, FaSpinner } from 'react-icons/fa';

type LocationMarkerType = {
  icon: Icon<IconOptions>;
};

const UserLocationMarker: FC<LocationMarkerType> = ({ icon }) => {
  const fillRedOptions = { fillColor: "#E53E3E", color: "#E53E3E" };
  const [position, setPosition] = useState<LatLng | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAsked, setHasAsked] = useState(false);

  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      setIsLoading(false);
      setError(null);
      map.flyTo(e.latlng, 14); // Zoom to street level when location found
    },
    locationerror(e) {
      setIsLoading(false);
      setError(e.message || "Unable to get your location");
      console.error("Location error:", e.message);
    },
  });

  const requestLocation = () => {
    setIsLoading(true);
    setError(null);
    setHasAsked(true);
    map.locate({
      setView: false,
      maxZoom: 14,
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  };

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <>
      {/* Location marker and circle */}
      {position && (
        <FeatureGroup pathOptions={fillRedOptions}>
          <Marker icon={icon} position={position}>
            <Popup>
              <div className="flex flex-col gap-1 items-start">
                <p className="flex items-center gap-1 font-semibold text-sm">
                  <FaMapMarkerAlt className="text-red-500" />
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

      {/* Locate Me Button - Fixed position above footer */}
      <div className="fixed bottom-24 md:bottom-20 right-4 z-[1000]">
        <button
          onClick={requestLocation}
          disabled={isLoading}
          className={`
            flex items-center gap-1.5 px-3 py-2 text-sm rounded-full shadow-md
            transition-all duration-200
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
              <FaSpinner className="animate-spin" />
              Finding...
            </>
          ) : error ? (
            <>
              <FaTimes />
              Retry
            </>
          ) : position ? (
            <>
              <FaMapMarkerAlt />
              Located
            </>
          ) : (
            <>
              <FaMapMarkerAlt />
              Locate Me
            </>
          )}
        </button>

        {/* Error message */}
        {error && hasAsked && (
          <div className="mt-2 bg-popover p-3 rounded-lg shadow-sm max-w-[250px]">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please enable location access in your browser settings
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UserLocationMarker;
