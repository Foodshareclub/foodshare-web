/**
 * useMarkerIcon Hook
 * Creates and manages beautiful custom marker icons for Leaflet maps
 */

import { useMemo } from "react";
import { DivIcon, Icon } from "leaflet";
import markerIconRed from "@/assets/location-red.svg";

/**
 * Creates a beautiful custom pin-style marker icon
 * @param isHovered - Whether the marker is being hovered
 * @param isSelected - Whether the marker is selected/active
 * @param showPulse - Whether to show the pulse animation
 */
export const useCustomMarkerIcon = (
  isHovered: boolean = false,
  isSelected: boolean = false,
  showPulse: boolean = false
) => {
  return useMemo(() => {
    const scale = isHovered || isSelected ? 1.2 : 1;
    const pulseHtml = showPulse ? '<div class="marker-pulse"></div>' : '';

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
        iconUrl: markerIconRed,
        iconSize: [25, 25],
        className: "custom-marker-user",
      }),
    []
  );
};

/**
 * Creates cluster marker icons with dynamic sizing
 * @param count - Number of markers in cluster
 */
export const createClusterIcon = (count: number) => {
  let size = 'small';
  if (count > 10) size = 'medium';
  if (count > 50) size = 'large';

  return new DivIcon({
    html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-cluster-icon',
    iconSize: [40, 40],
  });
};
