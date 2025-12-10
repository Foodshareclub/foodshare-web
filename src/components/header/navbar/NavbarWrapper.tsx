"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/header/navbar/Navbar";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/app/actions/auth";
import type { CustomRoomType } from "@/api/chatAPI";

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
    user_role?: string | null;
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
  const [productType, setProductType] = useState(defaultProductType);

  // Client-side auth for real-time updates (login/logout)
  const { isAuthenticated, user } = useAuth();

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

  // Use server-provided admin status (properly checks JSONB role, user_role, and user_roles table)
  const isAdmin = initialIsAdmin;

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`);
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
