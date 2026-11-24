"use client";

import { type FC } from "react";

export interface LocationStatusBannerProps {
  isApproximate?: boolean;
  city?: string;
  onUpgradeLocation?: () => Promise<void> | void;
  isUpgrading?: boolean;
  permissionState?: PermissionState | "unknown";
  className?: string;
}

/**
 * LocationStatusBanner is deprecated and hidden in production.
 * Feed location pinpointing and IP fallback operate seamlessly in the background without UI banners.
 */
export const LocationStatusBanner: FC<LocationStatusBannerProps> = () => {
  return null;
};
