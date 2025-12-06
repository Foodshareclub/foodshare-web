'use client';

/**
 * Settings Navbar - Client Component
 * Wrapper for the main Navbar component with settings-specific handlers
 */

import Navbar from '@/components/header/navbar/Navbar';
import { useRouter } from 'next/navigation';
import type { CustomRoomType } from '@/api/chatAPI';

interface SettingsNavbarProps {
  userId?: string;
  isAuth: boolean;
  isAdmin?: boolean;
  imgUrl?: string;
  firstName?: string;
  secondName?: string;
  email?: string;
  signalOfNewMessage?: CustomRoomType[];
}

export function SettingsNavbar({
  userId,
  isAuth,
  isAdmin = false,
  imgUrl = '',
  firstName = '',
  secondName = '',
  email = '',
  signalOfNewMessage = [],
}: SettingsNavbarProps) {
  const router = useRouter();

  // Navigation handlers
  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
  };

  const handleProductTypeChange = (_type: string) => {
    // No-op for settings pages - category changes navigate away
  };

  return (
    <Navbar
      userId={userId}
      isAuth={isAuth}
      isAdmin={isAdmin}
      productType="food"
      onRouteChange={handleRouteChange}
      onProductTypeChange={handleProductTypeChange}
      imgUrl={imgUrl}
      firstName={firstName}
      secondName={secondName}
      email={email}
      signalOfNewMessage={signalOfNewMessage}
    />
  );
}

export default SettingsNavbar;
