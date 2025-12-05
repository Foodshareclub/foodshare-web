'use client';

import { useGridSize } from '@/hooks';
import { ProductCard } from './ProductCard';
import SkeletonCard from './SkeletonCard';
import type { InitialProductStateType } from '@/types/product.types';

interface ProductGridProps {
  products: InitialProductStateType[];
  isLoading?: boolean;
}

// Pre-computed skeleton array (module-level constant)
const SKELETON_ITEMS = Array.from({ length: 10 }, (_, i) => i);

/**
 * ProductGrid - Displays products in a responsive grid
 * Note: React Compiler handles memoization automatically
 */
export function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  const gridSize = useGridSize();

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
      </div>
    </div>
  );
}

export default ProductGrid;
