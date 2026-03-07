"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/header/navbar/Navbar";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/lib/data/auth";
import type { CustomRoomType } from "@/api/chatAPI";
import { CATEGORIES, type CategoryId } from "@/constants/categories";

interface NavbarWrapperProps {
  defaultProductType?: string;
  /** Initial user data from server (required for SSR) */
  initialUser?: AuthUser | null;
  /** Initial admin status from server */
  initialIsAdmin?: boolean;
  /** Initial profile data from server */
  initialProfile?: {
    first_name?: string | null;
    second_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
  /** Unread message rooms from server */
  unreadRooms?: CustomRoomType[];
}

/**
 * Client-side wrapper for Navbar
 * Receives all data as props from Server Components
 * No TanStack Query - data is fetched on the server
 */
export function NavbarWrapper({
  defaultProductType = "food",
  initialUser,
  initialIsAdmin = false,
  initialProfile,
  unreadRooms = [],
}: NavbarWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize productType from pathname if possible
  const getInitialProductType = () => {
    if (!pathname) return defaultProductType;
    const path = pathname.split('/')[1] || "food";
    // Check if the path matches a valid category ID
    const validCategory = CATEGORIES.find(cat => cat.id === path);
    return (validCategory?.id as string) || defaultProductType;
  };

  const [productType, setProductType] = useState(getInitialProductType());

  // Update productType when pathname changes (direct navigation or back/forward)
  useEffect(() => {
    const path = pathname?.split('/')[1] || "food";
    const validCategory = CATEGORIES.find(cat => cat.id === path);
    if (validCategory && validCategory.id !== productType) {
      setProductType(validCategory.id);
    }
  }, [pathname, productType]);

  // Client-side auth for real-time updates (login/logout)
  // Must be called before any conditional returns (React hooks rules)
  const { isAuthenticated, user, isAdmin: clientIsAdmin } = useAuth();

  // Don't render navbar on map pages - MapClient renders its own navbar
  if (pathname?.startsWith("/map")) {
    return null;
  }

  // Prefer client auth state if available, fall back to server data
  const effectiveUser = user || (initialUser ? { id: initialUser.id } : null);
  const userId = effectiveUser?.id || "";

  // Use server-provided profile data
  const serverProfile = initialUser?.profile || initialProfile;

  const effectiveAvatarUrl = serverProfile?.avatar_url || "";
  const effectiveFirstName = serverProfile?.first_name || "";
  const effectiveSecondName = serverProfile?.second_name || "";
  const effectiveEmail = serverProfile?.email || "";

  // Auth state: client takes precedence for real-time updates
  const effectiveIsAuth = isAuthenticated || !!initialUser;

  // Use client admin status (from useAuth) with server fallback
  const isAdmin = clientIsAdmin || initialIsAdmin;

  const handleRouteChange = (_route: string) => {
    // Navigation is handled directly by Navbar.handleCategoryChange
    // This callback is kept for API compatibility
  };

  const handleProductTypeChange = (type: string) => {
    setProductType(type);
  };

  return (
    <Navbar
      userId={userId || initialUser?.id || ""}
      isAuth={effectiveIsAuth}
      isAdmin={isAdmin}
      productType={productType}
      onRouteChange={handleRouteChange}
      onProductTypeChange={handleProductTypeChange}
      imgUrl={effectiveAvatarUrl}
      firstName={effectiveFirstName}
      secondName={effectiveSecondName}
      email={effectiveEmail}
      signalOfNewMessage={unreadRooms}
    />
  );
}
