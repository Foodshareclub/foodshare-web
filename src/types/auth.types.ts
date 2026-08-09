/**
 * Authentication Type Definitions
 * Centralized types for authentication and user sessions
 */

import type { ServerActionResult } from "@/lib/errors";

export interface AuthUserProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  nickname?: string | null;
  avatar_url: string | null;
  email: string | null;
  search_radius_km: number | null;
  onboarding_completed?: boolean;
}

export interface AuthUser {
  id: string;
  email: string | undefined;
  profile?: AuthUserProfile | null;
}

export interface AuthSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  roles: string[];
}

export type AuthActionResult = ServerActionResult<void> & { error?: string };
export type OAuthUrlResult = ServerActionResult<{ url: string }> & {
  error?: string;
  url?: string | null;
};
