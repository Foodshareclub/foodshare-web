"use client";

import React, { useRef, useEffect } from "react";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { ProductCard } from "@/components/productCard/ProductCard";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import type { InitialProductStateType } from "@/types/product.types";

// Pre-computed skeleton arrays
const SKELETON_ITEMS = Array.from({ length: 10 }, (_, i) => i);
const LOADING_MORE_SKELETONS = Array.from({ length: 4 }, (_, i) => i);

type MainProps = {
  /** Products to display (passed from Server Component) */
  products: InitialProductStateType[];
  /** Whether products are loaded */
  isLoading?: boolean;
  /** Callback to load more items (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more items are being fetched */
  isFetchingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
};

/**
 * Main Component
 * Product listing view without map (map is available on separate /map page)
 * Receives products as props from Server Component (no Redux)
 * Supports infinite scroll when onLoadMore is provided
 */
export const Main: React.FC<MainProps> = ({
  products,
  isLoading = false,
  onLoadMore,
  isFetchingMore = false,
  hasMore = false,
}) => {
  const messagesAnchorRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loaded = !isLoading;

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isFetchingMore]);

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
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-10 page-px py-7"
          style={{
            transform: "translateZ(0)",
            willChange: "contents",
          }}
        >
          {!loaded
            ? SKELETON_ITEMS.map((i) => <SkeletonCard key={i} isLoaded={false} />)
            : products.map((product: InitialProductStateType) => (
                <ProductCard product={product} key={product.id} />
              ))}

          {/* Loading more skeletons */}
          {isFetchingMore &&
            LOADING_MORE_SKELETONS.map((i) => (
              <SkeletonCard key={`loading-more-${i}`} isLoaded={false} />
            ))}
        </div>

        {/* Infinite scroll trigger */}
        {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}
      </div>
    </>
  );
};
