'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/header/navbar/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries';

interface NavbarWrapperProps {
  defaultProductType?: string;
}

/**
 * Client-side wrapper for Navbar
 * Reusable across all pages that need the navbar with auth state
 * Keeps the layout as a server component for better SEO
 */
export function NavbarWrapper({ defaultProductType = 'food' }: NavbarWrapperProps) {
  const router = useRouter();
  const [productType, setProductType] = useState(defaultProductType);

  const { isAuthenticated, user } = useAuth();
  const userId = user?.id || '';
  const { profile, avatarUrl } = useCurrentProfile(userId);

  const isAdmin = profile?.role?.admin === true;

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  const handleProductTypeChange = (type: string) => {
    setProductType(type);
  };

  return (
    <Navbar
      userId={userId}
      isAuth={isAuthenticated}
      isAdmin={isAdmin}
      productType={productType}
      onRouteChange={handleRouteChange}
      onProductTypeChange={handleProductTypeChange}
      imgUrl={avatarUrl || profile?.avatar_url || ''}
      firstName={profile?.first_name || ''}
      secondName={profile?.second_name || ''}
      email={profile?.email || ''}
      signalOfNewMessage={[]}
    />
  );
}
