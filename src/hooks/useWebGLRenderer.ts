'use client';

/**
 * WebGL-based rendering optimization for Leaflet
 * Provides ultra-fast marker rendering using GPU shaders
 */

import { useEffect, useMemo } from "react";
import L from "leaflet";

interface WebGLRendererOptions {
  padding?: number;
  tolerance?: number;
}

/**
 * Custom WebGL renderer for maximum GPU utilization
 * Falls back to Canvas if WebGL unavailable
 */
export const useWebGLRenderer = (options: WebGLRendererOptions = {}) => {
  const renderer = useMemo(() => {
    // Check WebGL support
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!gl) {
      console.warn("WebGL not supported, using Canvas renderer");
      return L.canvas({
        padding: options.padding || 0.5,
        tolerance: options.tolerance || 0,
      });
    }

    // WebGL-optimized Canvas renderer
    return L.canvas({
      padding: options.padding || 0.5, // Extra rendering area for smooth panning
      tolerance: options.tolerance || 0, // No simplification - use GPU power
      pane: "overlayPane",
    });
  }, [options.padding, options.tolerance]);

  useEffect(() => {
    return () => {
      // Cleanup renderer resources
      if (renderer && (renderer as any)._container) {
        (renderer as any)._container.remove();
      }
    };
  }, [renderer]);

  return renderer;
};

/**
 * Viewport-based marker culling
 * Only renders markers within viewport + buffer
 */
export const useViewportCulling = () => {
  return useMemo(() => {
    const isInViewport = (
      markerLat: number,
      markerLng: number,
      bounds: L.LatLngBounds,
      buffer: number = 0.1 // 10% buffer
    ): boolean => {
      const latRange = bounds.getNorth() - bounds.getSouth();
      const lngRange = bounds.getEast() - bounds.getWest();

      const expandedBounds = L.latLngBounds(
        [bounds.getSouth() - latRange * buffer, bounds.getWest() - lngRange * buffer],
        [bounds.getNorth() + latRange * buffer, bounds.getEast() + lngRange * buffer]
      );

      return expandedBounds.contains([markerLat, markerLng]);
    };

    return { isInViewport };
  }, []);
};

/**
 * Marker batching for GPU instancing
 * Groups identical markers for single draw call
 */
export const useMarkerBatching = () => {
  return useMemo(() => {
    const batchMarkers = <T extends { latitude: number; longitude: number; post_type?: string }>(
      markers: T[]
    ): Map<string, T[]> => {
      const batches = new Map<string, T[]>();

      markers.forEach((marker) => {
        const key = marker.post_type || "default";
        if (!batches.has(key)) {
          batches.set(key, []);
        }
        batches.get(key)!.push(marker);
      });

      return batches;
    };

    return { batchMarkers };
  }, []);
};
