'use client';

import { useGridSize } from '@/hooks';
import { ProductCard } from './ProductCard';
import SkeletonCard from './SkeletonCard';
import type { InitialProductStateType } from '@/types/product.types';

interface ProductGridProps {
  products: InitialProductStateType[];
  isLoading?: boolean;
}

/**
 * ProductGrid - Displays products in a responsive grid
 * Accepts products as props instead of using Redux
 */
export function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  const gridSize = useGridSize();

  return (
    <div
      className="overflow-y-auto"
      style={{
        transform: 'translateZ(0)',
        WebkitOverflowScrolling: 'touch',
        willChange: 'scroll-position',
      }}
    >
      <div
        className="grid gap-10 px-7 py-7 xl:px-20"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          transform: 'translateZ(0)',
          willChange: 'contents',
        }}
      >
        {isLoading
          ? [...Array(10)].map((_, i) => <SkeletonCard key={i} isLoaded={false} />)
          : products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
      </div>
    </div>
  );
}

export default ProductGrid;
