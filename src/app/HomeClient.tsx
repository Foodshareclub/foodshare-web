'use client';

import { useState, useTransition } from 'react';
import { ProductGrid } from '@/components/productCard/ProductGrid';
import NavigateButtons from '@/components/navigateButtons/NavigateButtons';
import { useInfiniteProducts } from '@/hooks/queries/useProductQueries';
import type { InitialProductStateType } from '@/types/product.types';

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  productType?: string;
}

/**
 * HomeClient - Client wrapper for the home page
 * Uses React 19 patterns: useTransition for non-blocking updates
 * Uses infinite scroll with cursor-based pagination
 * React Compiler handles memoization automatically
 * 
 * Note: Navbar is rendered by root layout
 */
export function HomeClient({ initialProducts, productType = 'food' }: HomeClientProps) {
  const [currentProductType, setCurrentProductType] = useState(productType);
  const [isPending, startTransition] = useTransition();

  // Only use initialProducts for the original productType
  const isOriginalType = currentProductType === productType;

  // Infinite scroll query - uses server-fetched initialProducts as first page
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts(
    currentProductType,
    isOriginalType ? initialProducts : undefined
  );

  // Flatten pages into single array
  const products = data?.pages?.length
    ? data.pages.flatMap((page) => page.data)
    : isOriginalType ? initialProducts : [];

  // Use startTransition for non-blocking category changes
  const _handleProductTypeChange = (type: string) => {
    startTransition(() => {
      setCurrentProductType(type);
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Show loading state during category transition or initial load
  const showLoading = (isLoading || isPending) && !products.length;

  return (
    <>
      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={showLoading}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingNextPage || isPending}
        hasMore={hasNextPage ?? false}
      />
    </>
  );
}

export default HomeClient;
