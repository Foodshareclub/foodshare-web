"use client";

/**
 * MapViewController
 * Handles dynamic map view updates with 120Hz display support
 */

import { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";

interface MapViewControllerProps {
  center: [number, number];
  zoom: number;
  isUserLocation: boolean;
}

/**
 * Detect display refresh rate
 */
const detectRefreshRate = (): Promise<number> => {
  return new Promise((resolve) => {
    const lastTime = performance.now();
    let frames = 0;
    const maxFrames = 60;

    const measure = (currentTime: number) => {
      frames++;
      if (frames >= maxFrames) {
        const elapsed = currentTime - lastTime;
        const fps = (frames / elapsed) * 1000;
        // Round to common refresh rates: 60, 90, 120, 144
        const refreshRate = fps > 100 ? 120 : fps > 80 ? 90 : 60;
        resolve(refreshRate);
      } else {
        requestAnimationFrame(measure);
      }
    };

    requestAnimationFrame(measure);
  });
};

const MapViewController: React.FC<MapViewControllerProps> = ({ center, zoom, isUserLocation }) => {
  const map = useMap();
  const [refreshRate, setRefreshRate] = useState(60);
  const hasSetInitialView = useRef(false);

  // Detect display refresh rate on mount (delayed to not interfere with initial render)
  useEffect(() => {
    const timer = setTimeout(() => {
      detectRefreshRate().then((rate) => {
        setRefreshRate(rate);
      });
    }, 1000); // Wait 1 second for map to initialize

    return () => clearTimeout(timer);
  }, []);

  // Set initial view ONCE on mount, then allow user to freely navigate
  useEffect(() => {
    try {
      // Only set view once on initial mount
      if (hasSetInitialView.current) {
        return;
      }

      // Ensure map is initialized before attempting updates
      if (!map) {
        return;
      }

      // Validate center and zoom
      if (!center || !Array.isArray(center) || center.length !== 2) {
        return;
      }

      if (typeof zoom !== "number" || zoom < 2 || zoom > 18) {
        return;
      }

      // Adaptive animation duration based on refresh rate
      // 120Hz = faster, smoother animations
      // 60Hz = standard animations
      const baseDuration = isUserLocation ? 1.5 : 0.5;
      const adaptiveDuration = refreshRate >= 120 ? baseDuration * 0.75 : baseDuration;

      if (isUserLocation) {
        // Smooth fly animation optimized for high refresh rates
        map.flyTo(center, zoom, {
          duration: adaptiveDuration,
          easeLinearity: refreshRate >= 120 ? 0.15 : 0.25, // Smoother easing for 120Hz
          animate: true,
        });
      } else {
        // Instant update for product/fallback locations
        map.setView(center, zoom, {
          animate: refreshRate >= 90, // Enable animations on high-refresh displays
          duration: refreshRate >= 120 ? 0.3 : 0.5,
        });
      }

      // Mark that we've set the initial view
      hasSetInitialView.current = true;
    } catch (error) {
      console.error("[MapViewController] Error updating map view:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // Only run when map instance is available

  return null;
};

export default MapViewController;
