'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/header/navbar/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries';

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [productType, setProductType] = useState('community');

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
    <div className="min-h-screen bg-background">
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
      {children}
    </div>
  );
}
