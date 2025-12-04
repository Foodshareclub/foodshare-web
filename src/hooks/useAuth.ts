/**
 * useAuth Hook
 * Unified authentication hook using TanStack Query
 * Single source of truth: React Query handles data, Zustand only for UI state
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useSession,
  useIsAdmin,
  useSignIn,
  useSignUp,
  useSignOut,
  useSignInWithOtp,
  useSignInWithProvider,
  useRequestPasswordReset,
  useUpdatePassword,
} from "@/hooks/queries";
import { useAuthStore } from "@/store/zustand";
import type {
  AuthPayload,
  AuthProvider,
  LoginResult,
  AuthResult,
  UseAuthReturn,
} from "@/lib/auth/types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useAuth");

/**
 * Authentication Hook
 *
 * Single source of truth pattern:
 * - React Query: Handles all data fetching and caching (session, admin status)
 * - Zustand: Only used for mutation UI state (loading, errors) that React Query syncs
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { loginWithPassword, isLoading, error } = useAuth();
 *
 *   const handleLogin = async () => {
 *     const result = await loginWithPassword(email, password);
 *     if (result.success) {
 *       router.push('/dashboard');
 *     }
 *   };
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();

  // ========================================================================
  // TanStack Query - Single Source of Truth for Data
  // ========================================================================

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = useSession();

  const { data: adminData, status: adminQueryStatus } = useIsAdmin(
    sessionData?.user?.id
  );

  // Map TanStack Query status to legacy status format
  const adminCheckStatus = (() => {
    switch (adminQueryStatus) {
      case "pending":
        return "loading" as const;
      case "error":
        return "failed" as const;
      case "success":
        return "succeeded" as const;
      default:
        return "idle" as const;
    }
  })();

  const signInMutation = useSignIn();
  const signUpMutation = useSignUp();
  const signOutMutation = useSignOut();
  const signInWithOtpMutation = useSignInWithOtp();
  const signInWithProviderMutation = useSignInWithProvider();
  const recoverPasswordMutation = useRequestPasswordReset();
  const updatePasswordMutation = useUpdatePassword();

  // ========================================================================
  // Zustand - Only for UI state that mutations manage
  // ========================================================================

  const zustandRoles = useAuthStore((state) => state.roles);
  const zustandError = useAuthStore((state) => state.error);
  const zustandIsLoading = useAuthStore((state) => state.isLoading);
  const clearZustandError = useAuthStore((state) => state.clearError);

  // ========================================================================
  // Derived State - React Query is primary source
  // ========================================================================

  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;
  const isAuthenticated = sessionData?.isAuthenticated ?? false;
  const isAdmin = adminData?.isAdmin ?? false;
  const roles = adminData?.roles ?? zustandRoles;

  // Combine error sources (mutation errors take precedence)
  const error =
    signInMutation.error?.message ??
    signUpMutation.error?.message ??
    zustandError ??
    sessionError?.message ??
    null;

  // Combine loading states
  const isLoading =
    zustandIsLoading ||
    isSessionLoading ||
    signInMutation.isPending ||
    signUpMutation.isPending;

  // ========================================================================
  // Auth Actions
  // ========================================================================

  /**
   * Login with email and password
   */
  const loginWithPassword = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      logger.debug("loginWithPassword called", { email });

      try {
        const result = await signInMutation.mutateAsync({ email, password });

        if (result?.user) {
          logger.info("Login successful");
          return {
            success: true,
            user: result.user,
            session: result.session,
          };
        }

        return { success: false, error: "Login failed" };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Login failed";
        logger.error("Login failed", new Error(errorMessage));
        return { success: false, error: errorMessage };
      }
    },
    [signInMutation]
  );

  /**
   * Login with OAuth provider (Google, Facebook, Apple)
   */
  const loginWithOAuth = useCallback(
    async (provider: AuthProvider): Promise<AuthResult> => {
      try {
        await signInWithProviderMutation.mutateAsync(provider);
        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "OAuth login failed";
        return { success: false, error: errorMessage };
      }
    },
    [signInWithProviderMutation]
  );

  /**
   * Login with magic link (OTP)
   */
  const loginWithMagicLink = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        await signInWithOtpMutation.mutateAsync({ email });
        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Magic link failed";
        return { success: false, error: errorMessage };
      }
    },
    [signInWithOtpMutation]
  );

  /**
   * Register new user
   */
  const registerUser = useCallback(
    async (payload: AuthPayload): Promise<LoginResult> => {
      try {
        const result = await signUpMutation.mutateAsync(payload);

        if (result?.user) {
          return {
            success: true,
            user: result.user,
            session: result.session,
          };
        }

        return { success: false, error: "Registration failed" };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Registration failed";
        return { success: false, error: errorMessage };
      }
    },
    [signUpMutation]
  );

  /**
   * Logout user
   */
  const logoutUser = useCallback(async () => {
    await signOutMutation.mutateAsync();
    router.push("/");
  }, [signOutMutation, router]);

  /**
   * Request password recovery email
   */
  const recoverPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        await recoverPasswordMutation.mutateAsync(email);
        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Password recovery failed";
        return { success: false, error: errorMessage };
      }
    },
    [recoverPasswordMutation]
  );

  /**
   * Update password
   */
  const setNewPassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      try {
        await updatePasswordMutation.mutateAsync(password);
        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Password update failed";
        return { success: false, error: errorMessage };
      }
    },
    [updatePasswordMutation]
  );

  /**
   * Check session on mount
   */
  const checkSession = useCallback(async () => {
    await refetchSession();
  }, [refetchSession]);

  /**
   * Clear error state
   * Note: Using .reset directly avoids dependency on the full mutation object
   */
  const clearAuthError = useCallback(() => {
    clearZustandError();
    signInMutation.reset();
    signUpMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearZustandError]);

  // ========================================================================
  // Return Interface
  // ========================================================================

  return {
    // State (React Query as source of truth)
    isAuthenticated,
    isAdmin,
    adminCheckStatus,
    user,
    session,
    error,
    isLoading,
    roles,

    // Actions
    loginWithPassword,
    loginWithOAuth,
    loginWithMagicLink,
    register: registerUser,
    logout: logoutUser,
    recoverPassword,
    updatePassword: setNewPassword,
    clearError: clearAuthError,
    checkSession,

    // Backward compatibility aliases
    isAuth: isAuthenticated,
    authError: error,
    loginWithProvider: loginWithOAuth,
  };
}
