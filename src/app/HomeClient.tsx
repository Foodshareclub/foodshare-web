'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/header/navbar/Navbar';
import { ProductGrid } from '@/components/productCard/ProductGrid';
import NavigateButtons from '@/components/navigateButtons/NavigateButtons';
import type { InitialProductStateType } from '@/types/product.types';
import type { AuthUser } from '@/app/actions/auth';

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  user: AuthUser | null;
  productType?: string;
}

/**
 * HomeClient - Client wrapper for the home page
 * Handles interactive navigation while receiving server-fetched data
 */
export function HomeClient({ initialProducts, user, productType = 'food' }: HomeClientProps) {
  const router = useRouter();
  const [currentProductType, setCurrentProductType] = useState(productType);

  // Auth state derived from user prop
  const isAuth = !!user;
  const userId = user?.id || '';
  const profile = user?.profile;

  // Check if user is admin (role is 'admin' or 'superadmin')
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  // Handle route change - navigate to category page
  const handleRouteChange = useCallback((route: string) => {
    router.push(`/${route}`);
  }, [router]);

  // Handle product type change - update state and navigate
  const handleProductTypeChange = useCallback((type: string) => {
    setCurrentProductType(type);
    // Navigation handled by Navbar's internal logic
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
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

      {/* Navigation buttons */}
      <NavigateButtons title="Show map" />

      {/* Product listings grid */}
      <ProductGrid products={initialProducts} />
    </div>
  );
}

export default HomeClient;
