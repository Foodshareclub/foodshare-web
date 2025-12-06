'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/header/navbar/Navbar';
import { ProductGrid } from '@/components/productCard/ProductGrid';
import NavigateButtons from '@/components/navigateButtons/NavigateButtons';
import { useInfiniteProducts } from '@/hooks/queries/useProductQueries';
import type { InitialProductStateType } from '@/types/product.types';
import type { AuthUser } from '@/app/actions/auth';

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  user: AuthUser | null;
  productType?: string;
}

/**
 * HomeClient - Client wrapper for the home page
 * Uses React 19 patterns: useTransition for non-blocking updates
 * Uses infinite scroll with cursor-based pagination
 * React Compiler handles memoization automatically
 */
export function HomeClient({ initialProducts, user, productType = 'food' }: HomeClientProps) {
  const router = useRouter();
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

  // Derive auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || '';
  const profile = user?.profile;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  // Use startTransition for non-blocking category changes
  const handleProductTypeChange = (type: string) => {
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
    <div className="min-h-screen bg-background">
      <Navbar
        userId={userId}
        isAuth={isAuth}
        isAdmin={isAdmin}
        productType={currentProductType}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={profile?.avatar_url || ''}
        firstName={profile?.first_name || ''}
        secondName={profile?.second_name || ''}
        email={profile?.email || ''}
        signalOfNewMessage={[]}
      />

      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={showLoading}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingNextPage || isPending}
        hasMore={hasNextPage ?? false}
      />
    </div>
  );
}

export default HomeClient;
