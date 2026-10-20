"use client";

/**
 * MapPositionTracker - reports viewport changes to the host component.
 *
 * Previously this also did two things that do not work:
 *
 *   1. POSTed to `/api/map-services/preferences` on every `moveend`. That route
 *      does not exist (src/app/api/ contains only `[[...route]]`, `admin`,
 *      `challenges`, `chat`, `health`, `products`, `ready`, `sentry-test`), so
 *      every pan produced a guaranteed 404 — while still consuming one of the
 *      30/minute mutation-limiter budget, which is how map marker loading was
 *      getting rate limited.
 *   2. Opened a WebSocket to `/api/map-services/sync` and sent
 *      `{ type: "auth", userId }` where userId came from `localStorage`. That
 *      route does not exist either, so the socket failed immediately and
 *      reconnected every 5s forever. Even if it had existed, a client-supplied
 *      userId in an auth frame is not authentication.
 *
 * Both are removed rather than reimplemented: cross-device map sync needs a
 * real backend and real auth, and until then the honest behaviour is to report
 * the viewport locally and make no network calls.
 *
 * `onPositionChange` is still called on every `moveend` (debounced) — that is
 * what drives the URL/center state in MapClient.
 */

import { useEffect, useRef } from "react";
import { useMapEvents } from "react-leaflet";

interface MapPositionTrackerProps {
  category: string;
  onPositionChange: (center: [number, number], zoom: number) => void;
}

const SAVE_DEBOUNCE_MS = 1000;

const MapPositionTracker: React.FC<MapPositionTrackerProps> = ({ category: _category, onPositionChange }) => {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = useMapEvents({
    moveend() {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const center = map.getCenter();
        onPositionChange([center.lat, center.lng], map.getZoom());
      }, SAVE_DEBOUNCE_MS);
    },
  });

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
