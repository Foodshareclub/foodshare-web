"use client";

/**
 * Leaflet Component
 * Beautiful map view for product detail pages
 * Receives product as props from parent component (no Redux)
 */

import type React from "react";
import { useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "./leaflet.css";
import "./leaflet-glass.css";
import "leaflet/dist/leaflet.css";
import { type InitialProductStateType, getCoordinates } from "@/types/product.types";
import { approximateLocation } from "@/utils/postgis";
import { hasExactPublicLocation } from "@/utils/publicPlaces";
import { DivIcon } from "leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

// Use Canvas renderer for GPU acceleration
const _canvasRenderer = L.canvas({ padding: 0.5 });

type LeafletProps = {
  /** Product data passed from parent component */
  product?: InitialProductStateType | null;
};

const Leaflet: React.FC<LeafletProps> = ({ product }) => {
  const oneProduct = product;
  const defaultZoom = 15;
  const t = useTranslations();

  // Create a beautiful custom marker with pulse animation
  const customMarker = useMemo(
    () =>
      new DivIcon({
        className: "custom-map-marker",
        html: `
          <div class="marker-pin-container">
            <div class="marker-pulse"></div>
            <div class="marker-pin">
              <div class="marker-pin-inner"></div>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      }),
    [],
  );

  if (!oneProduct) {
    return (
      <div className="h-full min-h-[300px] bg-muted flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🗺️</span>
          <p className="text-muted-foreground text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  // Parse PostGIS coordinates
  const coords = getCoordinates(oneProduct);
  if (!coords) {
    return (
      <div className="h-full min-h-[300px] bg-muted flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📍</span>
          <p className="text-muted-foreground text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  // Fridges and food banks are public places; every other type is moved
  // 100-200m for privacy (deterministic on the post ID).
  const exactLocation = hasExactPublicLocation(oneProduct.post_type);
  const shownCoords = exactLocation ? coords : approximateLocation(coords.lat, coords.lng, oneProduct.id);
  const position: [number, number] = [shownCoords.lat, shownCoords.lng];

  return (
    <div className="relative h-full" style={{ transform: "translateZ(0)", willChange: "transform" }}>
      {/* Map Container */}
      <MapContainer
        style={{
          height: "100%",
          minHeight: "300px",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        center={position}
        zoom={defaultZoom}
        preferCanvas={true}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Beautiful Carto Light Map Tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        />

        {/* Uncertainty circle: only where the point is approximated */}
        {!exactLocation && (
          <Circle
            center={position}
            radius={200}
            pathOptions={{
              color: "#FF2D55",
              fillColor: "#FF2D55",
              fillOpacity: 0.08,
              weight: 1,
              opacity: 0.3,
            }}
          />
        )}

        {/* Custom Marker with Popup */}
        <Marker icon={customMarker} position={position} title={oneProduct.post_name || t("address")}>
          <Popup className="product-card-popup">
            <div className="product-popup-card">
              <p className="product-popup-title">{oneProduct.post_name}</p>
              <span className="product-popup-badge">{oneProduct.post_type}</span>
              {oneProduct.post_stripped_address && (
                <p className="product-popup-address">📍 {oneProduct.post_stripped_address}</p>
              )}
              {oneProduct.post_description && (
                <p className="product-popup-description">{oneProduct.post_description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default Leaflet;
