'use client';

/**
 * Leaflet Component
 * Simple map view for product detail pages
 * Receives product as props from parent component (no Redux)
 */

import React, { useMemo } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "./leaflet.css";
import "./leaflet-glass.css";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import L from "leaflet";
import { getCoordinates, type InitialProductStateType } from "@/types/product.types";
import icon from "@/assets/location-red.svg";

// Use Canvas renderer for GPU acceleration
const canvasRenderer = L.canvas({ padding: 0.5 });

type LeafletProps = {
  /** Product data passed from parent component */
  product?: InitialProductStateType | null;
};

const Leaflet: React.FC<LeafletProps> = ({ product }) => {
  const oneProduct = product;
  const defaultZoom = 12;

  // Memoize icon creation for better performance
  const skater = useMemo(
    () =>
      new Icon({
        iconUrl: icon,
        iconSize: [25, 25],
        className: "custom-marker-cluster",
      }),
    []
  );

  if (!oneProduct) return <div className="animate-pulse bg-gray-200 h-full min-h-[300px] rounded-lg" />;

  // Parse PostGIS coordinates
  const coords = getCoordinates(oneProduct);
  if (!coords) return <div className="animate-pulse bg-gray-200 h-full min-h-[300px] rounded-lg" />;

  const position: [number, number] = [coords.lat, coords.lng];

  return (
    <div style={{ transform: "translateZ(0)", willChange: "transform", height: "100%" }}>
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
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        />
        <Marker icon={skater} position={position} title={oneProduct.post_name}></Marker>
      </MapContainer>
    </div>
  );
};

export default Leaflet;
