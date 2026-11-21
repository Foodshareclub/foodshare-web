/**
 * useMarkerIcon Hook
 * Creates and manages beautiful custom marker icons for Leaflet maps
 */

import markerIconRed from "@/assets/location-red.svg";
import { DivIcon, Icon } from "leaflet";
import { useMemo } from "react";

/**
 * Creates a beautiful custom pin-style marker icon
 * @param isHovered - Whether the marker is being hovered
 * @param isSelected - Whether the marker is selected/active
 * @param showPulse - Whether to show the pulse animation
 */
export const useCustomMarkerIcon = (isHovered = false, isSelected = false, showPulse = false) => {
  return useMemo(() => {
    const scale = isHovered || isSelected ? 1.2 : 1;
    const pulseHtml = showPulse ? '<div class="marker-pulse"></div>' : "";

    return new DivIcon({
      className: "custom-map-marker",
      html: `
        <div class="marker-pin-container" style="transform: scale(${scale})">
          <div class="marker-pin">
            <div class="marker-pin-inner"></div>
          </div>
          ${pulseHtml}
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });
  }, [isHovered, isSelected, showPulse]);
};

/**
 * Creates a simple red marker icon for user location
 */
export const useUserLocationIcon = () => {
  return useMemo(
    () =>
      new Icon({
        iconUrl: markerIconRed.src,
        iconSize: [25, 25],
        className: "custom-marker-user",
      }),
    [],
  );
};

/**
 * Creates cluster marker icons with dynamic sizing
 * @param count - Number of markers in cluster
 */
export const createClusterIcon = (count: number) => {
  let size = "small";
  if (count > 10) size = "medium";
  if (count > 50) size = "large";

  return new DivIcon({
    html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
    className: "custom-cluster-icon",
    iconSize: [40, 40],
  });
};

export type PillMarkerState = "default" | "hovered" | "selected";

const PILL_ICON_CACHE = new Map<string, DivIcon>();
const PILL_ICON_CACHE_MAX = 600;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

/**
 * Price-tag style marker: a small pill with the listing name.
 * Selected is larger and inverted (`bg-foreground`). Styled with Tailwind utilities, no global CSS.
 * Icons are cached by label and state so identity stays stable across renders.
 */
export const createPillMarkerIcon = (label: string, state: PillMarkerState = "default") => {
  const text = label.trim().slice(0, 40) || "•";
  const key = `${state}:${text}`;
  const cached = PILL_ICON_CACHE.get(key);
  if (cached) return cached;
  if (PILL_ICON_CACHE.size >= PILL_ICON_CACHE_MAX) PILL_ICON_CACHE.clear();
  const tone =
    state === "selected"
      ? "bg-foreground text-background border-foreground scale-110"
      : state === "hovered"
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-foreground border-border";
  // The Leaflet icon element is the focusable hit area; the inner span is the pill.
  // Leaflet forces `display: block` on the icon, so layout lives on the child.
  const icon = new DivIcon({
    className:
      "custom-map-marker group/pin -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    html: `<span class="flex h-8 max-w-[160px] items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold shadow-md transition-transform duration-150 group-hover/pin:scale-105 motion-reduce:transition-none ${tone}"><span class="truncate">${escapeHtml(text)}</span></span>`,
    iconSize: undefined,
  });
  PILL_ICON_CACHE.set(key, icon);
  return icon;
};
