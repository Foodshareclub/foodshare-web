/**
 * ProductPopup Component
 * Reusable popup card for map markers
 * Used across all map implementations (LeafletPage, MapView, ProductsLocation)
 */

import { getProductDetailUrl } from "@/utils/categoryMapping";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";

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
  productType,
  name,
  type,
  description,
  address,
  image,
  distance,
}) => {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(getProductDetailUrl(productType, id));
  };

  return (
    <div className="product-popup-card">
      {image && (
        <Image src={image} alt={name} className="product-popup-image" width={280} height={160} loading="lazy" />
      )}

      <h4 className="product-popup-title">{name}</h4>

      {type && <span className="product-popup-badge">{type}</span>}

      {address && <p className="product-popup-address">📍 {address}</p>}

      {description && <p className="product-popup-description">{description}</p>}

      {distance !== undefined && <p className="product-popup-distance">📍 {distance.toFixed(1)} km away</p>}

      <button type="button" onClick={handleViewDetails} className="product-popup-button">
        View Details
      </button>
    </div>
  );
};
