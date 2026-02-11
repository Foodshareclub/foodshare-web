/**
 * MainWithMap Component
 * Split-view layout: Product listings (left) + Leaflet map (right)
 * Following Airbnb's design pattern with 65/35 split on desktop
 * Receives products as props from Server Component (no Redux)
 */

"use client";

import { useRef, useState } from "react";
import { MapView } from "./MapView";
import { useGridSize, useMediaQuery } from "@/hooks";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { ProductCard } from "@/components/productCard/ProductCard";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import type { InitialProductStateType, ProductWithCoordinates } from "@/types/product.types";
import { getCoordinates } from "@/types/product.types";

type MainWithMapProps = {
  /** Products to display (passed from Server Component) */
  products: InitialProductStateType[];
  /** Whether products are loading */
  isLoading?: boolean;
};

// React Compiler handles memoization automatically
export function MainWithMap({ products, isLoading = false }: MainWithMapProps) {
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const loaded = !isLoading;
  const gridSize = useGridSize();
  const messagesAnchorRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  // Show map on desktop only (>= 1024px breakpoint)
  const showMap = useMediaQuery("(min-width: 1024px)");

  // Convert products to include coordinates for map display
  // React Compiler handles memoization automatically
  const productsWithCoordinates: ProductWithCoordinates[] = products
    .map((product) => {
      const coords = getCoordinates(product);
      if (!coords) return null;
      return {
        ...product,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    })
    .filter((p): p is ProductWithCoordinates => p !== null);

  // React Compiler optimizes these handlers automatically
  const handleProductHover = (productId: number | null) => {
    setHoveredProductId(productId);
  };

  const handleProductClick = (productId: number) => {
    setSelectedProductId(productId);
  };

  return (
    <>
      {/* Fixed buttons */}
      <NavigateButtons messagesAnchorRef={messagesAnchorRef} title={"Show map"} />

      {/* Split-view layout */}
      <div className="block lg:grid lg:grid-cols-[65%_35%] gap-0 min-h-[calc(100vh-80px)]">
        {/* Left side - Product listings (scrollable) */}
        <div
          ref={messagesAnchorRef}
          className="overflow-y-auto lg:max-h-[calc(100vh-80px)]"
          style={{
            transform: "translateZ(0)",
            WebkitOverflowScrolling: "touch",
            willChange: "scroll-position",
          }}
        >
          <div
            className="grid gap-10 px-7 py-7 xl:px-20"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              transform: "translateZ(0)",
              willChange: "contents",
            }}
          >
            {!loaded
              ? [...Array(10)].map((_, i) => <SkeletonCard key={i} isLoaded={false} />)
              : products.map((product: InitialProductStateType) => (
                  <ProductCard
                    product={product}
                    key={product.id}
                    onMouseEnter={() => handleProductHover(product.id)}
                    onMouseLeave={() => handleProductHover(null)}
                    onClick={() => handleProductClick(product.id)}
                  />
                ))}
          </div>
        </div>

        {/* Right side - Map (sticky on desktop) */}
        {showMap && (
          <div
            className="sticky top-[80px] h-[calc(100vh-80px)] hidden lg:block"
            style={{
              transform: "translateZ(0)",
              willChange: "transform",
            }}
          >
            <MapView
              products={productsWithCoordinates}
              hoveredProductId={hoveredProductId}
              selectedProductId={selectedProductId}
              onMarkerClick={handleProductClick}
            />
          </div>
        )}
      </div>
    </>
  );
}
