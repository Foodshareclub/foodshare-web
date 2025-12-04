/**
 * ProductsLocation Component
 * Map view for individual product detail pages
 * Shows product location with custom marker and popup
 * Receives product as props from Server Component (no Redux)
 */

import React from "react";
import { MapContainer, Marker, TileLayer, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { ProductPopup } from "@/components/map/ProductPopup";
import { useCustomMarkerIcon } from "@/hooks/useMarkerIcon";
import { getCoordinates, type InitialProductStateType } from "@/types/product.types";

type LocationType = {
  indicator?: string;
  /** Product data passed from parent component */
  product?: InitialProductStateType | null;
};

export const ProductsLocation: React.FC<LocationType> = ({ indicator, product }) => {
  const oneProduct = product;
  const defaultZoom = 15;

  // Custom animated marker with pulse
  const redMarker = useCustomMarkerIcon(false, false, true);

  if (!oneProduct || !oneProduct.location) return null;

  // Parse PostGIS coordinates
  const coords = getCoordinates(oneProduct);
  if (!coords) return null;

  const position: [number, number] = [coords.lat, coords.lng];

  return (
    <div
      className={`
        ${indicator ? "md:w-[70%]" : "md:w-1/2"}
        w-full
        md:h-[70vh]
        h-[50vh]
        relative
        rounded-2xl
        overflow-hidden
        shadow-lg
      `}
    >
      <MapContainer
        style={{
          height: "100%",
          width: "100%",
        }}
        center={position}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Beautiful CartoDB Voyager tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={20}
        />

        {/* Accuracy circle */}
        <Circle
          center={position}
          radius={50}
          pathOptions={{
            fillColor: "#E53E3E",
            fillOpacity: 0.1,
            color: "#E53E3E",
            weight: 1,
            opacity: 0.3,
          }}
        />

        {/* Custom marker with interactive card popup */}
        <Marker icon={redMarker} position={position}>
          <Popup className="custom-popup product-card-popup" maxWidth={280} closeButton={true}>
            <ProductPopup
              id={oneProduct.id}
              productType={oneProduct.post_type}
              name={oneProduct.post_name}
              address={oneProduct.post_stripped_address}
              description={oneProduct.post_description}
              image={oneProduct.images?.[0]}
            />
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
