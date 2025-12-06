'use client';

import { useEffect, useRef } from 'react';
import { useGridSize } from '@/hooks';
import { ProductCard } from './ProductCard';
import SkeletonCard from './SkeletonCard';
import type { InitialProductStateType } from '@/types/product.types';

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
 * Note: React Compiler handles memoization automatically
 */
export function ProductGrid({
  products,
  isLoading = false,
  onLoadMore,
  isFetchingMore = false,
  hasMore = false,
}: ProductGridProps) {
  const gridSize = useGridSize();
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
      { rootMargin: '200px' } // Trigger 200px before reaching the end
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
    <div
      className="overflow-y-auto"
      style={{ transform: 'translateZ(0)', WebkitOverflowScrolling: 'touch' }}
    >
      <div
        className="grid gap-10 px-7 py-7 xl:px-20"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {isLoading
          ? SKELETON_ITEMS.map((i) => <SkeletonCard key={i} isLoaded={false} />)
          : products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
        
        {/* Loading more skeletons */}
        {isFetchingMore &&
          LOADING_MORE_SKELETONS.map((i) => (
            <SkeletonCard key={`loading-more-${i}`} isLoaded={false} />
          ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && (
        <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
      )}
    </div>
  );
}

export default ProductGrid;
