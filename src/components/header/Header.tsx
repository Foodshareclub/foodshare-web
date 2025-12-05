'use client';

import React, { memo } from 'react';
import { Navbar } from '@/components/header/navbar';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/queries/useChatQueries';
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries';

type HeaderProps = {
  getRoute: (route: string) => void;
  setProductType: (type: string) => void;
  productType: string;
};

/**
 * Header Component
 * Integrates the Navbar with app logic
 * Uses useAuth hook (TanStack Query + Zustand) instead of Redux
 */
const Header: React.FC<HeaderProps> = memo(({ getRoute, setProductType, productType }) => {
  // Auth state from useAuth hook (TanStack Query + Zustand)
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  // Profile data from React Query
  const { profile, avatarUrl, isProfileLoading } = useCurrentProfile(userId);

  // Final avatar URL with fallback chain
  const finalAvatarUrl = avatarUrl || profile?.avatar_url || undefined;

  // Debug: Log avatar data flow (only when authenticated)
  if (process.env.NODE_ENV === 'development' && isAuthenticated) {
    console.log('[Header] Avatar debug:', {
      userId,
      isProfileLoading,
      hasProfile: !!profile,
      profileAvatarUrl: profile?.avatar_url,
      computedAvatarUrl: avatarUrl,
      finalAvatarUrl,
    });
  }

  // Chat rooms from React Query
  const { data: allUserRooms = [] } = useRooms(userId);

  // User data from profile
  const firstName = profile?.first_name ?? null;
  const secondName = profile?.second_name ?? null;
  const email = user?.email ?? profile?.email ?? null;

  // Calculate unread messages (messages not sent by current user)
  const signalOfNewMessage = allUserRooms.filter((room) => room.last_message_sent_by !== userId);

  return (
    <Navbar
      userId={userId}
      isAuth={isAuthenticated}
      productType={productType}
      onRouteChange={getRoute}
      onProductTypeChange={setProductType}
      imgUrl={finalAvatarUrl}
      firstName={firstName ?? undefined}
      secondName={secondName ?? undefined}
      email={email ?? undefined}
      signalOfNewMessage={signalOfNewMessage}
    />
  );
});

Header.displayName = 'Header';

export default Header;
