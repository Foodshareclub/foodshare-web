'use client';

/**
 * Leaflet Component
 * Beautiful map view for product detail pages
 * Receives product as props from parent component (no Redux)
 */

import React, { useMemo } from "react";
import { MapContainer, Marker, TileLayer, Popup, Circle } from "react-leaflet";
import "./leaflet.css";
import "./leaflet-glass.css";
import "leaflet/dist/leaflet.css";
import { Icon, DivIcon } from "leaflet";
import L from "leaflet";
import { getCoordinates, type InitialProductStateType } from "@/types/product.types";

// Use Canvas renderer for GPU acceleration
const _canvasRenderer = L.canvas({ padding: 0.5 });

type LeafletProps = {
  /** Product data passed from parent component */
  product?: InitialProductStateType | null;
};

const Leaflet: React.FC<LeafletProps> = ({ product }) => {
  const oneProduct = product;
  const defaultZoom = 15;

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
    []
  );

  if (!oneProduct) {
    return (
      <div className="h-full min-h-[300px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
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
      <div className="h-full min-h-[300px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📍</span>
          <p className="text-muted-foreground text-sm">Location not available</p>
        </div>
      </div>
    );
  }

  const position: [number, number] = [coords.lat, coords.lng];

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
        
        {/* Subtle radius circle around location */}
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
        
        {/* Custom Marker with Popup */}
        <Marker icon={customMarker} position={position}>
          <Popup className="product-card-popup">
            <div className="product-popup-card">
              <h3 className="product-popup-title">{oneProduct.post_name}</h3>
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

      {/* Floating Info Card */}
      <div className="absolute bottom-4 left-4 right-4 lg:left-4 lg:right-auto lg:max-w-xs z-[1000]">
        <div className="bg-card/90 backdrop-blur-lg rounded-2xl shadow-xl border border-border/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📍</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{oneProduct.post_name}</h4>
              <p className="text-sm text-muted-foreground truncate">{oneProduct.post_stripped_address}</p>
              {oneProduct.available_hours && (
                <p className="text-xs text-muted-foreground/70 mt-1">🕐 {oneProduct.available_hours}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaflet;
