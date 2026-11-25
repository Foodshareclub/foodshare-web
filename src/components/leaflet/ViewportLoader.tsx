"use client";

/**
 * ViewportLoader - Robust viewport-based marker loader for Leaflet maps.
 *
 * Resilience guarantees:
 * - Requests GET `/api/map/locations` (never spends POST mutation rate limits).
 * - Deduplicates identical in-flight and completed bounds so zoom transitions
 *   never self-abort or issue redundant network requests.
 * - Commits `lastBoundsRef` only after a `200` response succeeds, so aborted or
 *   transiently failing requests never permanently lock out a zoom level.
 * - Automatically retries once on transient 5xx / network failure before surfacing
 *   an error state, while always preserving visible markers on failure.
 * - Normalizes zoomed-out longitudes and splits antimeridian-crossing viewports
 *   into compliant `west <= east` boxes so markers never disappear across +/-180 deg.
 */

import type { LocationType } from "@/types/product.types";
import { useCallback, useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";

interface ViewportLoaderProps {
  productType: string;
  onLocationsLoaded: (locations: LocationType[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (hasError: boolean) => void;
  retryKey?: number;
}

export interface BoundsBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

const DEBOUNCE_MS = 250;
const RETRY_DELAY_MS = 900;
const CLIENT_CACHE_TTL_MS = 30_000;
const MAX_CLIENT_CACHE_ENTRIES = 16;
/** Bounds below this precision change represent the same tile; skip redundant fetches. */
const BOUNDS_PRECISION = 3;

interface CachedViewportEntry {
  locations: LocationType[];
  timestamp: number;
}
const viewportCache = new Map<string, CachedViewportEntry>();

function readViewportCache(key: string): LocationType[] | null {
  const entry = viewportCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CLIENT_CACHE_TTL_MS) {
    viewportCache.delete(key);
    return null;
  }
  // Refresh LRU order
  viewportCache.delete(key);
  viewportCache.set(key, entry);
  return entry.locations;
}

function writeViewportCache(key: string, locations: LocationType[]) {
  if (viewportCache.has(key)) {
    viewportCache.delete(key);
  } else if (viewportCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
    const oldestKey = viewportCache.keys().next().value;
    if (oldestKey !== undefined) viewportCache.delete(oldestKey);
  }
  viewportCache.set(key, { locations, timestamp: Date.now() });
}

function wrapLongitude(lng: number): number {
  if (lng >= -180 && lng <= 180) return lng;
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

/**
 * Normalizes Leaflet longitudes into 1 or 2 compliant [west, east] ranges within [-180, 180].
 * Handles world min-zoom spans (>= 360 deg), negative/positive wraps, and +/-180 antimeridian crossings.
 */
export function normalizeLongitudeBoxes(west: number, east: number): Array<{ west: number; east: number }> {
  if (!Number.isFinite(west) || !Number.isFinite(east)) {
    return [{ west: -180, east: 180 }];
  }

  if (east - west >= 360) {
    return [{ west: -180, east: 180 }];
  }

  const normWest = wrapLongitude(west);
  const normEast = wrapLongitude(east);

  if (normWest <= normEast) {
    return [{ west: normWest, east: normEast }];
  }

  // Viewport straddles the +/-180 deg antimeridian: split into two valid boxes
  return [
    { west: normWest, east: 180 },
    { west: -180, east: normEast },
  ];
}

export function sanitizeMapBounds(mapBounds: L.LatLngBounds): BoundsBox[] {
  const north = Math.max(-90, Math.min(90, mapBounds.getNorth()));
  const south = Math.max(-90, Math.min(90, mapBounds.getSouth()));
  const boxes = normalizeLongitudeBoxes(mapBounds.getWest(), mapBounds.getEast());

  return boxes.map((box) => ({
    north,
    south,
    west: box.west,
    east: box.east,
  }));
}

function computeBoundsKey(boxes: BoundsBox[]): string {
  return boxes
    .map((b) =>
      [
        b.north.toFixed(BOUNDS_PRECISION),
        b.south.toFixed(BOUNDS_PRECISION),
        b.east.toFixed(BOUNDS_PRECISION),
        b.west.toFixed(BOUNDS_PRECISION),
      ].join(","),
    )
    .join("|");
}

const ViewportLoader: React.FC<ViewportLoaderProps> = ({
  productType,
  onLocationsLoaded,
  onLoadingChange,
  onErrorChange,
  retryKey = 0,
}) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string>("");
  const inFlightBoundsRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const prevTypeRef = useRef<string>(productType);

  // Reset cached bounds key when category changes so the new category always loads
  if (prevTypeRef.current !== productType) {
    prevTypeRef.current = productType;
    lastBoundsRef.current = "";
    inFlightBoundsRef.current = "";
  }

  const loadLocations = useCallback(
    async (boxes: BoundsBox[], attempt = 0, force = false) => {
      const boundsKey = computeBoundsKey(boxes);
      const cacheKey = `${productType}:${boundsKey}`;

      if (!force && (boundsKey === lastBoundsRef.current || boundsKey === inFlightBoundsRef.current)) {
        return;
      }

      if (!force) {
        const cached = readViewportCache(cacheKey);
        if (cached) {
          lastBoundsRef.current = boundsKey;
          onErrorChange?.(false);
          onLoadingChange?.(false);
          onLocationsLoaded(cached);
          return;
        }
      }

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // Cancel superseded in-flight request for older bounds
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      inFlightBoundsRef.current = boundsKey;

      onLoadingChange?.(true);

      try {
        const responses = await Promise.all(
          boxes.map(async (bounds) => {
            const params = new URLSearchParams({
              north: String(bounds.north),
              south: String(bounds.south),
              east: String(bounds.east),
              west: String(bounds.west),
            });
            if (productType) params.set("type", productType);

            const response = await fetch(`/api/map/locations?${params.toString()}`, {
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const data: unknown = await response.json();
            return (data as { locations?: LocationType[] })?.locations ?? [];
          }),
        );

        if (controller.signal.aborted) return;

        // Deduplicate markers if antimeridian split executed two queries
        const merged =
          responses.length === 1
            ? responses[0]
            : Array.from(new Map(responses.flat().map((item) => [item.id, item])).values());

        writeViewportCache(cacheKey, merged);
        lastBoundsRef.current = boundsKey;
        inFlightBoundsRef.current = "";
        onErrorChange?.(false);
        onLoadingChange?.(false);
        onLocationsLoaded(merged);
      } catch (error) {
        if (controller.signal.aborted) {
          if (inFlightBoundsRef.current === boundsKey) {
            inFlightBoundsRef.current = "";
          }
          return;
        }

        inFlightBoundsRef.current = "";
        console.warn("[ViewportLoader] Transient failure loading bounds:", error);

        if (attempt < 1) {
          retryTimerRef.current = setTimeout(() => {
            void loadLocations(boxes, attempt + 1, true);
          }, RETRY_DELAY_MS);
          return;
        }

        onLoadingChange?.(false);
        onErrorChange?.(true);
      }
    },
    [productType, onLocationsLoaded, onLoadingChange, onErrorChange],
  );

  const map = useMapEvents({
    moveend() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void loadLocations(sanitizeMapBounds(map.getBounds()));
      }, DEBOUNCE_MS);
    },
  });

  // Load locations on initial mount and whenever explicit retry is triggered
  useEffect(() => {
    const force = retryKey > 0;
    const timer = setTimeout(
      () => {
        void loadLocations(sanitizeMapBounds(map.getBounds()), 0, force);
      },
      force ? 0 : 80,
    );

    return () => {
      clearTimeout(timer);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      abortRef.current?.abort();
    };
  }, [map, loadLocations, retryKey]);

  return null;
};

export default ViewportLoader;
