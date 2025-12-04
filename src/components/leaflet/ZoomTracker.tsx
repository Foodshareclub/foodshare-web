'use client';

/**
 * ZoomTracker Component
 * Tracks user zoom changes and caches preferences
 */

import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";

interface ZoomTrackerProps {
  onZoomChange: (zoom: number, userInitiated: boolean) => void;
}

const ZoomTracker: React.FC<ZoomTrackerProps> = ({ onZoomChange }) => {
  const isUserInteraction = useRef(false);
  const lastZoom = useRef<number | null>(null);

  const map = useMapEvents({
    zoomstart() {
      // Detect if zoom was initiated by user (not programmatic)
      // User interactions: scroll wheel, zoom buttons, pinch
      isUserInteraction.current = true;
    },

    zoomend() {
      const currentZoom = map.getZoom();

      // Only trigger callback if zoom actually changed
      if (lastZoom.current !== currentZoom) {
        onZoomChange(currentZoom, isUserInteraction.current);
        lastZoom.current = currentZoom;
      }

      // Reset interaction flag
      isUserInteraction.current = false;
    },
  });

  // Initialize last zoom on mount
  useEffect(() => {
    lastZoom.current = map.getZoom();
  }, [map]);

  return null;
};

export default ZoomTracker;
