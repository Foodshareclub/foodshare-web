'use client';

import React, { useRef } from "react";
import { useGridSize } from "@/hooks";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { ProductCard } from "@/components/productCard/ProductCard";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import type { InitialProductStateType } from "@/types/product.types";

type MainProps = {
  /** Products to display (passed from Server Component) */
  products: InitialProductStateType[];
  /** Whether products are loaded */
  isLoading?: boolean;
};

/**
 * Main Component
 * Product listing view without map (map is available on separate /map page)
 * Receives products as props from Server Component (no Redux)
 */
export const Main: React.FC<MainProps> = ({ products, isLoading = false }) => {
  const gridSize = useGridSize();
  const messagesAnchorRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const loaded = !isLoading;

  return (
    <>
      {/* Navigation buttons */}
      <NavigateButtons messagesAnchorRef={messagesAnchorRef} title={"Show map"} />

      {/* Product listings grid */}
      <div
        ref={messagesAnchorRef}
        className="overflow-y-auto"
        style={{
          transform: "translateZ(0)",
          WebkitOverflowScrolling: "touch",
          willChange: "scroll-position",
        }}
      >
        <div
          className={`grid gap-10 px-7 py-7 xl:px-20`}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            transform: "translateZ(0)",
            willChange: "contents",
          }}
        >
          {!loaded
            ? [...Array(10)].map((_, i) => <SkeletonCard key={i} isLoaded={false} />)
            : products.map((product: InitialProductStateType) => (
                <ProductCard product={product} key={product.id} />
              ))}
        </div>
      </div>
    </>
  );
};
