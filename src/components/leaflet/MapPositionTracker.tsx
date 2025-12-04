'use client';

/**
 * MapPositionTracker Component
 * Saves user's map position when they pan/zoom for seamless return visits
 */

import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";

interface MapPositionTrackerProps {
  category: string;
  onPositionChange: (center: [number, number], zoom: number) => void;
}

const MapPositionTracker: React.FC<MapPositionTrackerProps> = ({
  category,
  onPositionChange,
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const map = useMapEvents({
    moveend() {
      // Debounce position saving (wait 500ms after user stops moving)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        onPositionChange([center.lat, center.lng], zoom);
      }, 500);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return null;
};

export default MapPositionTracker;
