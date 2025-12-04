/**
 * Authentication API
 * Clean, type-safe auth operations
 * Centralized error handling and validation
 */

import { supabase } from "./client";
import type { AuthProvider, AuthCredentials, SignUpData } from "./types";
import type { AuthResponse, OAuthResponse } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AuthAPI");

// ============================================================================
// Constants
// ============================================================================

const OAUTH_STATE_KEY = "foodshare_oauth_state";
const AUTH_RETURN_URL_KEY = "auth_return_url";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get callback URL for current environment
 */
function getCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Generate secure CSRF state for OAuth
 */
function generateOAuthState(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Authentication API
// ============================================================================

export const auth = {
  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    const { email, password, firstName, lastName, metadata = {} } = data;

    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          ...metadata,
        },
        emailRedirectTo: getCallbackUrl(),
      },
    });
  },

  /**
   * Sign in with email and password
   */
  async signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    logger.debug("signIn called", { email: credentials.email });
    const response = await supabase.auth.signInWithPassword(credentials);
    logger.debug("signIn response", {
      hasUser: !!response.data.user,
      hasSession: !!response.data.session,
      error: response.error?.message,
    });
    return response;
  },

  /**
   * Sign in with magic link (OTP)
   */
  async signInWithOtp(email: string): Promise<AuthResponse> {
    return supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getCallbackUrl(),
      },
    });
  },

  /**
   * Sign in with OAuth provider
   * Includes CSRF protection
   */
  async signInWithProvider(provider: AuthProvider): Promise<OAuthResponse> {
    // Generate and store CSRF state
    const state = generateOAuthState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    // Store current location for post-auth redirect
    sessionStorage.setItem(AUTH_RETURN_URL_KEY, window.location.pathname);

    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getCallbackUrl(),
        queryParams: { state },
      },
    });
  },

  /**
   * Verify OAuth callback state (CSRF protection)
   */
  verifyOAuthState(urlState: string | null): boolean {
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);

    if (!urlState || !storedState) return false;
    return urlState === storedState;
  },

  /**
   * Get auth return URL
   */
  getReturnUrl(): string {
    const returnUrl = sessionStorage.getItem(AUTH_RETURN_URL_KEY) || "/";
    sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
    return returnUrl;
  },

  /**
   * Sign out
   */
  async signOut() {
    return supabase.auth.signOut();
  },

  /**
   * Get current session
   */
  async getSession() {
    return supabase.auth.getSession();
  },

  /**
   * Get current user
   */
  async getUser() {
    return supabase.auth.getUser();
  },

  /**
   * Refresh session
   */
  async refreshSession() {
    return supabase.auth.refreshSession();
  },

  /**
   * Request password reset
   */
  async resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  },

  /**
   * Update password
   */
  async updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },

  /**
   * Update email
   */
  async updateEmail(email: string) {
    return supabase.auth.updateUser({ email });
  },

  /**
   * Update user metadata
   */
  async updateMetadata(data: Record<string, unknown>) {
    return supabase.auth.updateUser({ data });
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
} as const;
