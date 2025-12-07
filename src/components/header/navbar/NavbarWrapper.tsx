'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/header/navbar/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries';
import type { AuthUser } from '@/app/actions/auth';

interface NavbarWrapperProps {
  defaultProductType?: string;
  /** Optional initial user data from server to prevent loading flicker */
  initialUser?: AuthUser | null;
}

/**
 * Client-side wrapper for Navbar
 * Reusable across all pages that need the navbar with auth state
 * Keeps the layout as a server component for better SEO
 * 
 * Avatar component handles default fallback automatically
 */
export function NavbarWrapper({ defaultProductType = 'food', initialUser }: NavbarWrapperProps) {
  const router = useRouter();
  const [productType, setProductType] = useState(defaultProductType);

  const { isAuthenticated, user } = useAuth();
  
  // Use server-provided user data as initial state, fall back to client-fetched data
  const effectiveUser = user || (initialUser ? { id: initialUser.id } : null);
  const userId = effectiveUser?.id || '';
  
  const { profile } = useCurrentProfile(userId);

  // Derive values with server data as fallback
  const serverProfile = initialUser?.profile;
  
  // Avatar URL: Server data first (immediate), then client data (after query loads)
  // Avatar component handles empty/invalid → default avatar fallback
  const effectiveAvatarUrl = serverProfile?.avatar_url || profile?.avatar_url || '';
  const effectiveFirstName = serverProfile?.first_name || profile?.first_name || '';
  const effectiveSecondName = serverProfile?.second_name || profile?.second_name || '';
  const effectiveEmail = serverProfile?.email || profile?.email || '';
  
  // Use server-provided auth state as initial, then client state takes over
  const effectiveIsAuth = isAuthenticated || !!initialUser;
  const isAdmin = profile?.role?.admin === true || 
    serverProfile?.role === 'admin' || 
    serverProfile?.role === 'superadmin';

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  const handleProductTypeChange = (type: string) => {
    setProductType(type);
  };

  return (
    <Navbar
      userId={userId || initialUser?.id || ''}
      isAuth={effectiveIsAuth}
      isAdmin={isAdmin}
      productType={productType}
      onRouteChange={handleRouteChange}
      onProductTypeChange={handleProductTypeChange}
      imgUrl={effectiveAvatarUrl}
      firstName={effectiveFirstName}
      secondName={effectiveSecondName}
      email={effectiveEmail}
      signalOfNewMessage={[]}
    />
  );
}
