"use client";

import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ProductCard } from "./ProductCard";
import SkeletonCard from "./SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "./listing-layout";

interface ProductGridProps {
  products: InitialProductStateType[];
  isLoading?: boolean;
  /** Callback to load more items (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more items are being fetched */
  isFetchingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
}

// Pre-computed skeleton array (module-level constant)
const SKELETON_ITEMS = Array.from({ length: 10 }, (_, i) => i);
const LOADING_MORE_SKELETONS = Array.from({ length: 4 }, (_, i) => i);

/**
 * ProductGrid - Displays products in a responsive grid with infinite scroll
 * Keeps readable card widths, from one column on phones to four on desktop.
 */
export function ProductGrid({
  products,
  isLoading = false,
  onLoadMore,
  isFetchingMore = false,
  hasMore = false,
}: ProductGridProps) {
  const t = useTranslations();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" } // Trigger 200px before reaching the end
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
    <div aria-busy={isLoading || isFetchingMore}>
      <h2 className="sr-only">{t("active_listings")}</h2>
      <div className={cn(LISTING_CONTAINER, "py-6 pb-28 sm:py-8 sm:pb-32")}>
        <div className={LISTING_GRID}>
          {isLoading
            ? SKELETON_ITEMS.map((i) => <SkeletonCard key={i} isLoaded={false} />)
            : products.map((product) => <ProductCard product={product} key={product.id} />)}

          {/* Loading more skeletons */}
          {isFetchingMore &&
            LOADING_MORE_SKELETONS.map((i) => (
              <SkeletonCard key={`loading-more-${i}`} isLoaded={false} />
            ))}
        </div>
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}
    </div>
  );
}

export default ProductGrid;
