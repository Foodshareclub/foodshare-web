/**
 * Auth Types
 * Centralized type definitions for authentication
 */

import type { User, Session, AuthError } from "@supabase/supabase-js";

export type AuthProvider = "google" | "apple" | "github" | "facebook";
export type OtpType = "sms" | "email" | "phone_change";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends AuthCredentials {
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string | null;
}

export interface LoginResult extends AuthResult {
  user?: User;
  session?: Session | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminCheckStatus: "idle" | "loading" | "succeeded" | "failed";
  user: User | null;
  session: Session | null;
  error: string | null;
  isLoading: boolean;
  roles: string[];

  // Actions
  loginWithPassword: (email: string, password: string) => Promise<LoginResult>;
  loginWithOAuth: (provider: AuthProvider) => Promise<AuthResult>;
  loginWithMagicLink: (email: string) => Promise<AuthResult>;
  register: (payload: AuthPayload) => Promise<LoginResult>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  clearError: () => void;
  checkSession: () => Promise<void>;

  // Backward compatibility aliases
  isAuth: boolean;
  authError: string | null;
  loginWithProvider: (provider: AuthProvider) => Promise<AuthResult>;
}
