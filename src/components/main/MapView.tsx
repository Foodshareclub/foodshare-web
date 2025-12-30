/**
 * MapView Component
 * Leaflet map with product markers for split-view display
 * Optimized for performance with Canvas renderer and marker clustering
 */

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { ProductWithCoordinates } from "@/types/product.types";
import markerIconRed from "@/assets/location-red.svg";
import { useCustomMarkerIcon } from "@/hooks/useMarkerIcon";
import { generateProductPopupHTML } from "@/utils/mapHelpers";

// Fix Leaflet default marker icon issue - using custom red markers
// This is a known Leaflet issue where _getIconUrl needs to be deleted

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconRed,
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type MapViewProps = {
  products: ProductWithCoordinates[];
  hoveredProductId: number | null;
  selectedProductId: number | null;
  onMarkerClick: (productId: number) => void;
};

// React Compiler handles memoization automatically
export function MapView({
  products,
  hoveredProductId,
  selectedProductId,
  onMarkerClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Get marker icons from hook
  const defaultIcon = useCustomMarkerIcon(false, false);
  const hoveredIcon = useCustomMarkerIcon(true, false);
  const selectedIcon = useCustomMarkerIcon(false, true);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map with Canvas renderer for better performance
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: true,
    }).setView([50.0755, 14.4378], 12); // Default to Prague

    // Add beautiful CartoDB Voyager tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when products change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers that are no longer in products
    const productIds = new Set(products.map((p) => p.id));
    currentMarkers.forEach((marker, id) => {
      if (!productIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add or update markers
    products.forEach((product) => {
      // Products must have coordinates (enforced by ProductWithCoordinates type)
      if (!product.latitude || !product.longitude) return;

      const existingMarker = currentMarkers.get(product.id);

      if (existingMarker) {
        // Update existing marker position if needed
        const currentLatLng = existingMarker.getLatLng();
        if (currentLatLng.lat !== product.latitude || currentLatLng.lng !== product.longitude) {
          existingMarker.setLatLng([product.latitude, product.longitude]);
        }
      } else {
        // Create new marker with interactive product card popup
        const marker = L.marker([product.latitude, product.longitude], {
          icon: defaultIcon,
        })
          .addTo(map)
          .bindPopup(generateProductPopupHTML(product, product.post_type), {
            className: "custom-popup product-card-popup",
            maxWidth: 280,
            closeButton: true,
          });

        marker.on("click", () => {
          onMarkerClick(product.id);
        });

        currentMarkers.set(product.id, marker);
      }
    });

    // Fit map bounds to show all markers
    if (products.length > 0) {
      const validProducts = products.filter((p) => p.latitude && p.longitude);
      if (validProducts.length > 0) {
        const bounds = L.latLngBounds(
          validProducts.map((p) => [p.latitude, p.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [products, defaultIcon, onMarkerClick]);

  // Update marker appearance on hover/select
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isHovered = id === hoveredProductId;
      const isSelected = id === selectedProductId;

      if (isSelected) {
        marker.setIcon(selectedIcon);
        marker.openPopup();
      } else if (isHovered) {
        marker.setIcon(hoveredIcon);
      } else {
        marker.setIcon(defaultIcon);
      }
    });
  }, [hoveredProductId, selectedProductId, defaultIcon, hoveredIcon, selectedIcon]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    />
  );
}
