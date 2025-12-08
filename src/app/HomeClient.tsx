'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/productCard/ProductGrid';
import NavigateButtons from '@/components/navigateButtons/NavigateButtons';
import type { InitialProductStateType } from '@/types/product.types';

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  productType?: string;
}

/**
 * HomeClient - Client wrapper for the home page
 * Receives products from Server Component
 * Uses router.refresh() for category changes
 * 
 * Note: Navbar is rendered by root layout
 */
export function HomeClient({ initialProducts, productType = 'food' }: HomeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Products from server
  const products = initialProducts;

  // Handle load more - triggers server-side fetch
  const handleLoadMore = () => {
    // For infinite scroll, we'd need to implement cursor-based pagination
    // via URL params and server-side fetching
    // For now, this is a placeholder
    startTransition(() => {
      router.refresh();
    });
  };

  // Show loading state during transition
  const showLoading = isPending && !products.length;

  return (
    <>
      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={showLoading}
        onLoadMore={handleLoadMore}
        isFetchingMore={isPending}
        hasMore={false} // Server determines this
      />
    </>
  );
}

export default HomeClient;
