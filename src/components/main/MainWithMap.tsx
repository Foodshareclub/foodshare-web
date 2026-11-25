/**
 * MainWithMap Component
 * Split-view layout: Product listings (left) + Leaflet map (right)
 * Following Airbnb's design pattern with 65/35 split on desktop
 * Receives products as props from Server Component (no Redux)
 */

"use client";

import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { ProductCard } from "@/components/productCard/ProductCard";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isValidImageUrl } from "@/lib/image";
import { resolveRealisticCover } from "@/lib/realistic-covers";
import type { InitialProductStateType, ProductWithCoordinates } from "@/types/product.types";
import { getCoordinates } from "@/types/product.types";
import { useMemo, useRef, useState } from "react";
import { MapView } from "./MapView";

const MAIN_GRID_SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;

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

  const coverMap = useMemo(() => {
    const usedUrls = new Set<string>();
    const map = new Map<number, string>();
    for (const product of products) {
      const hasRealPhoto = product.images && product.images.some((url) => isValidImageUrl(url));
      if (!hasRealPhoto) {
        const cover = resolveRealisticCover({
          title: product.post_name,
          postType: product.post_type,
          postId: product.id,
          excludeUrls: Array.from(usedUrls),
        });
        map.set(product.id, cover);
        usedUrls.add(cover);
      }
    }
    return map;
  }, [products]);

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
            className="grid gap-x-6 gap-y-10 p-4 sm:p-6 lg:p-8"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              transform: "translateZ(0)",
              willChange: "contents",
            }}
          >
            {!loaded
              ? MAIN_GRID_SKELETON_KEYS.map((k) => <SkeletonCard key={k} isLoaded={false} />)
              : products.map((product: InitialProductStateType) => (
                  <ProductCard
                    product={product}
                    coverUrl={coverMap.get(product.id)}
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
