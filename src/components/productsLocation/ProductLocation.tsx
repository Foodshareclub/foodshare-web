/**
 * ProductsLocation Component
 * Map view for individual product detail pages
 * Shows product location with custom marker and popup
 * Receives product as props from Server Component (no Redux)
 *
 * SECURITY: Applies 200m location approximation for user privacy
 */

"use client";

import React from "react";
import { MapContainer, Marker, TileLayer, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";

import { ProductPopup } from "@/components/map/ProductPopup";
import { useCustomMarkerIcon } from "@/hooks/useMarkerIcon";
import { getCoordinates, type InitialProductStateType } from "@/types/product.types";
import { approximateLocation, LOCATION_PRIVACY } from "@/utils/postgis";

type LocationType = {
  indicator?: string;
  /** Product data passed from parent component */
  product?: InitialProductStateType | null;
};

export const ProductsLocation: React.FC<LocationType> = ({ indicator, product }) => {
  const oneProduct = product;
  const defaultZoom = 15;
  const t = useTranslations();

  // Custom animated marker with pulse
  const redMarker = useCustomMarkerIcon(false, false, true);

  if (!oneProduct || !oneProduct.location) return null;

  // Parse PostGIS coordinates
  const coords = getCoordinates(oneProduct);
  if (!coords) return null;

  // SECURITY: Apply 200m approximation for privacy (deterministic based on post ID)
  const approxCoords = approximateLocation(coords.lat, coords.lng, oneProduct.id);
  const position: [number, number] = [approxCoords.lat, approxCoords.lng];

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

        {/* Privacy approximation circle (200m radius to match approximation) */}
        <Circle
          center={position}
          radius={LOCATION_PRIVACY.RADIUS_METERS}
          pathOptions={{
            fillColor: "#FF2D55",
            fillOpacity: 0.08,
            color: "#FF2D55",
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

      {/* Location approximation disclaimer */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000]">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
            <span className="text-amber-500">&#9888;</span>
            {t("location_approximate_disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
};
