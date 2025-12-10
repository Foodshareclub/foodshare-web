"use client";

import React from "react";
import { Navbar } from "@/components/header/navbar";

import type { CustomRoomType } from "@/api/chatAPI";

type HeaderProps = {
  // Auth data (passed from server)
  userId?: string;
  isAuth: boolean;
  isAdmin?: boolean;
  imgUrl?: string;
  firstName?: string;
  secondName?: string;
  email?: string;
  // Chat data (passed from server)
  signalOfNewMessage?: Array<CustomRoomType>;
  // Notification data (passed from server)
  initialUnreadCount?: number;
  // Route handlers
  onRouteChange: (route: string) => void;
  onProductTypeChange: (type: string) => void;
  productType: string;
};

/**
 * Header Component
 * Pure client component that receives all data as props from HeaderServer
 * No TanStack Query - data is fetched on the server
 */
export default function Header({
  userId,
  isAuth,
  isAdmin = false,
  imgUrl = "",
  firstName,
  secondName,
  email,
  signalOfNewMessage = [],
  initialUnreadCount = 0,
  onRouteChange,
  onProductTypeChange,
  productType,
}: HeaderProps) {
  return (
    <Navbar
      userId={userId}
      isAuth={isAuth}
      isAdmin={isAdmin}
      productType={productType}
      onRouteChange={onRouteChange}
      onProductTypeChange={onProductTypeChange}
      imgUrl={imgUrl}
      firstName={firstName}
      secondName={secondName}
      email={email}
      signalOfNewMessage={signalOfNewMessage}
      initialUnreadCount={initialUnreadCount}
    />
  );
}
