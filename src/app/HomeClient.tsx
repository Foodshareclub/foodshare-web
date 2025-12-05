'use client';

import { useState } from 'react';
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
 * Note: React Compiler handles memoization automatically
 */
export function HomeClient({ initialProducts, user, productType = 'food' }: HomeClientProps) {
  const router = useRouter();
  const [currentProductType, setCurrentProductType] = useState(productType);

  // Derive auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || '';
  const profile = user?.profile;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  const handleProductTypeChange = (type: string) => {
    setCurrentProductType(type);
  };

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
      <ProductGrid products={initialProducts} />
    </div>
  );
}

export default HomeClient;
