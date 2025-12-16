/**
 * ProductPopup Component
 * Reusable popup card for map markers
 * Used across all map implementations (LeafletPage, MapView, ProductsLocation)
 */

import React from "react";
import { useRouter } from "next/navigation";

type ProductPopupProps = {
  id: number;
  productType: string;
  name: string;
  type?: string;
  description?: string;
  address?: string;
  image?: string;
  distance?: number;
};

export const ProductPopup: React.FC<ProductPopupProps> = ({
  id,
  productType: _productType,
  name,
  type,
  description,
  address,
  image,
  distance,
}) => {
  const router = useRouter();

  const handleViewDetails = () => {
    // All products use /food/[id] path
    router.push(`/food/${id}`);
  };

  return (
    <div className="product-popup-card">
      {image && (
        <img
          src={image}
          alt={name}
          className="product-popup-image"
          loading="lazy"
          decoding="async"
        />
      )}

      <h4 className="product-popup-title">{name}</h4>

      {type && <span className="product-popup-badge">{type}</span>}

      {address && <p className="product-popup-address">📍 {address}</p>}

      {description && <p className="product-popup-description">{description}</p>}

      {distance !== undefined && (
        <p className="product-popup-distance">📍 {distance.toFixed(1)} km away</p>
      )}

      <button onClick={handleViewDetails} className="product-popup-button">
        View Details
      </button>
    </div>
  );
};
