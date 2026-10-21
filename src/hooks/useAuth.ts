/**
 * useAuth Hook
 * Client-side authentication hook using Server Actions
 *
 * For Server Components, use getAuthSession() from '@/lib/data/auth' instead.
 * This hook is for Client Components that need auth state and actions.
 */

"use client";

import { resetPassword, signInWithPassword, signOut, signUp, updatePassword } from "@/app/actions/auth";
import { type AuthErrorCode, getAuthErrorCode, sanitizeErrorMessage } from "@/lib/errors";
import { pretty } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/zustand";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";

// ============================================================================
// Global Types for SDKs
// ============================================================================

declare global {
  interface Window {
    AppleID: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          nonce?: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state?: string;
          };
          user?: {
            name?: {
              firstName?: string;
              lastName?: string;
            };
            email?: string;
          };
        }>;
      };
    };
  }
}

import type { AuthUser } from "@/types";

// ============================================================================
// Types
// ============================================================================

/**
 * What every auth action resolves to.
 *
 * `error` is an `AuthErrorCode`, not a message, so nothing in this file has to
 * invent a sentence. It used to: seven `"Login failed"`-shaped fallbacks, each
 * of which reached the screen verbatim in 21 locales, and each of which was
 * reachable precisely when something had already gone wrong.
 */
export type AuthOutcome = { success: boolean; error?: AuthErrorCode };

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminCheckStatus: "idle" | "loading" | "succeeded" | "failed";
  user: AuthUser | null;
  session: Session | null;
  /** An `AuthErrorCode`, resolved through `t()` by whoever renders it. */
  error: AuthErrorCode | null;
  isLoading: boolean;
  roles: string[];

  // Actions
  loginWithPassword: (email: string, password: string) => Promise<AuthOutcome>;
  loginWithOAuth: (provider: "google" | "github" | "facebook" | "apple") => Promise<AuthOutcome>;
  loginWithMagicLink: (email: string) => Promise<AuthOutcome>;
  register: (
    data: { email: string; password: string; firstName?: string; lastName?: string } | string,
    password?: string,
    name?: string,
  ) => Promise<AuthOutcome & { user?: AuthUser }>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<AuthOutcome>;
  updatePassword: (password: string) => Promise<AuthOutcome>;
  clearError: () => void;
  checkSession: () => Promise<void>;

  // Backward compatibility aliases
  isAuth: boolean;
  authError: string | null;
  loginWithProvider: (
    provider: "google" | "github" | "facebook" | "apple",
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Classify a thrown value.
 *
 * The fallback code is the operation the caller was attempting, not a generic
 * "something went wrong": "sign-in failed" is actionable where "unknown" is
 * not, and a reader who mistyped their password deserves to be told signing in
 * failed rather than that something went wrong.
 */
const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(sanitizeErrorMessage(String(error)));

const thrownCode = (error: unknown, fallback: AuthErrorCode): AuthErrorCode => {
  const message = error instanceof Error ? error.message : String(error);
  const code = getAuthErrorCode(message);
  return code === "unknown" ? fallback : code;
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Use Zustand for shared auth state (fixes race condition where multiple components
  // calling useAuth() would each have their own loading state)
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const roles = useAuthStore((state) => state.roles);
  const adminCheckStatus = useAuthStore((state) => state.adminCheckStatus);

  // Zustand actions
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const clearErrorAction = useAuthStore((state) => state.clearError);
  const reset = useAuthStore((state) => state.reset);

  // ========================================================================
  // Admin Check
  // ========================================================================

  const checkAdminStatus = useCallback(
    async (userId: string) => {
      // Get current state and actions directly from store to avoid dependency issues
      const currentState = useAuthStore.getState();

      // Skip if already loading
      if (currentState.adminCheckStatus === "loading") {
        return;
      }

      // If status is "succeeded" but isAdmin is still false, the state was only
      // partially restored from localStorage (adminCheckStatus is persisted but
      // isAdmin is not). Re-check in this case.
      if (currentState.adminCheckStatus === "succeeded" && currentState.isAdmin) {
        return;
      }

      // Get actions from store (stable reference pattern)
      useAuthStore.getState().setAdminCheckStatus("loading");

      try {
        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role_id,roles!user_roles_role_id_fkey(name)")
          .eq("profile_id", userId);

        pretty.debug("[checkAdminStatus] Fetching roles", { userId });
        pretty.debug("[checkAdminStatus] Role data", { data });

        if (roleError) {
          pretty.error("[checkAdminStatus] Query error", roleError);
          useAuthStore.getState().setAdminCheckStatus("failed");
          return;
        }

        const userRoles = (data ?? []).flatMap((r) => {
          const roleName = (r as { roles?: { name?: string } }).roles?.name;
          return roleName ? [roleName] : [];
        });

        const isUserAdmin = userRoles.includes("admin") || userRoles.includes("superadmin");

        pretty.debug("[checkAdminStatus] Results", { userRoles, isUserAdmin });

        // Use fresh reference to avoid stale closure
        useAuthStore.getState().setAdmin(isUserAdmin, userRoles);
      } catch (error) {
        pretty.error("[checkAdminStatus] Unexpected error", error as Error);
        useAuthStore.getState().setAdminCheckStatus("failed");
      }
    },
    [supabase], // Only supabase as dependency - Zustand actions accessed via getState()
  );

  // ========================================================================
  // Auth State Listener
  // ========================================================================

  useEffect(() => {
    // Skip if already loaded (another component already initialized)
    const currentState = useAuthStore.getState();
    if (!currentState.isLoading && (currentState.user || currentState.session)) {
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        // Use getState() for stable action references
        useAuthStore.getState().setAuth(initialSession?.user ?? null, initialSession);

        // Check admin status if user exists
        if (initialSession?.user) {
          await checkAdminStatus(initialSession.user.id);
        }
      } catch (err) {
        console.error("Error getting initial session:", err);
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      useAuthStore.getState().setAuth(newSession?.user ?? null, newSession);

      if (newSession?.user) {
        await checkAdminStatus(newSession.user.id);
      } else {
        useAuthStore.getState().reset();
      }

      // Refresh server components on auth change
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, checkAdminStatus]); // Minimal stable dependencies only

  // ========================================================================
  // Auth Actions
  // ========================================================================

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      clearErrorAction();
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        const result = await signInWithPassword(formData);

        if (!result.success) {
          const code = result.error ?? "signInFailed";
          setError(code);
          return { success: false, error: code };
        }

        startTransition(() => {
          router.refresh();
        });

        return { success: true };
      } catch (err) {
        // Logged, not shown. A thrown exception's message is English, arbitrary,
        // and sometimes a stack fragment — none of which is a thing to put in
        // front of somebody who mistyped their password.
        const code = thrownCode(err, "signInFailed");
        pretty.error("[loginWithPassword] Failed", asError(err), { code });
        setError(code);
        return { success: false, error: code };
      } finally {
        setLoading(false);
      }
    },
    [router, clearErrorAction, setLoading, setError],
  );

  const loginWithApple = useCallback(async () => {
    clearErrorAction();
    setLoading(true);

    try {
      // 1. Initialize Apple SDK
      // The clientId is the Service ID from Apple Developer Portal
      const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "club.foodshare.web";

      window.AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI: `${window.location.origin}/auth/callback`,
        usePopup: true,
      });

      // 2. Perform Sign-In
      const response = await window.AppleID.auth.signIn();
      const { id_token: identityToken } = response.authorization;

      pretty.info("[AppleAuth] Identity token received", {
        hasToken: !!identityToken,
        hasUser: !!response.user,
      });

      // 3. Call Universal Edge Function
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-v1-auth/apple`;
      const authResponse = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-info": "@supabase/auth-helpers-nextjs",
        },
        body: JSON.stringify({
          identityToken,
          firstName: response.user?.name?.firstName,
          lastName: response.user?.name?.lastName,
          email: response.user?.email,
        }),
      });

      const result = await authResponse.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "oauthFailed");
      }

      // 4. Set Supabase Session
      const { access_token, refresh_token } = result.data;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || "",
      });

      if (sessionError) throw sessionError;

      pretty.success("[AppleAuth] Session established successfully");

      startTransition(() => {
        router.refresh();
      });

      return { success: true };
    } catch (err) {
      const code = thrownCode(err, "oauthFailed");
      pretty.error("[AppleAuth] Failed", asError(err), { code });
      setError(code);
      return { success: false, error: code };
    } finally {
      setLoading(false);
    }
  }, [supabase, router, clearErrorAction, setLoading, setError]);

  const loginWithOAuth = useCallback(
    async (provider: "google" | "github" | "facebook" | "apple") => {
      // Special handling for Apple to use Vault-native Edge Function
      if (provider === "apple") {
        return loginWithApple();
      }

      clearErrorAction();

      try {
        // Get the current path to redirect back after OAuth
        const currentPath = window.location.pathname;
        const redirectUrl = new URL("/auth/callback", window.location.origin);
        // Pass the current path as 'next' so callback redirects back here
        if (currentPath && currentPath !== "/auth/callback") {
          redirectUrl.searchParams.set("next", currentPath);
        }

        // Use browser client directly for OAuth - this ensures same-tab redirect
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl.toString(),
            skipBrowserRedirect: false, // Ensure redirect happens in same tab
          },
        });

        if (oauthError) {
          // The untranslated string this replaced was built here, on the client,
          // from an English template: `${Provider} sign-in is not correctly
          // configured. Please contact support or use a different method.` The
          // provider's *name* is still interpolated — by the caller, from the
          // translated `Auth.continueWithGoogle` label — so the sentence around
          // it can finally be translated.
          const code = getAuthErrorCode(oauthError);
          pretty.warn("[loginWithOAuth] Unavailable", { provider, code }, sanitizeErrorMessage(oauthError.message));
          setError(code);
          return { success: false, error: code };
        }

        return { success: true };
      } catch (err) {
        const code = thrownCode(err, "oauthFailed");
        pretty.error("[loginWithOAuth] Failed", asError(err), { code });
        setError(code);
        return { success: false, error: code };
      }
    },
    [supabase, loginWithApple, clearErrorAction, setError],
  );

  const loginWithMagicLink = useCallback(
    async (email: string) => {
      clearErrorAction();

      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (otpError) {
          const code = getAuthErrorCode(otpError);
          setError(code);
          return { success: false, error: code };
        }

        return { success: true };
      } catch (err) {
        const code = thrownCode(err, "signInFailed");
        setError(code);
        return { success: false, error: code };
      }
    },
    [supabase, clearErrorAction, setError],
  );

  const register = useCallback(
    async (
      dataOrEmail: { email: string; password: string; firstName?: string; lastName?: string } | string,
      passwordArg?: string,
      nameArg?: string,
    ) => {
      clearErrorAction();
      setLoading(true);

      try {
        // Support both object and positional arguments for backward compatibility
        let email: string;
        let password: string;
        let firstName: string | undefined;
        let lastName: string | undefined;

        if (typeof dataOrEmail === "object") {
          email = dataOrEmail.email;
          password = dataOrEmail.password;
          firstName = dataOrEmail.firstName;
          lastName = dataOrEmail.lastName;
        } else {
          email = dataOrEmail;
          password = passwordArg!;
          // If nameArg is provided, use it as firstName
          firstName = nameArg;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        if (firstName) formData.append("firstName", firstName);
        if (lastName) formData.append("lastName", lastName);
        // Also support legacy 'name' field
        if (firstName && lastName) {
          formData.append("name", `${firstName} ${lastName}`);
        } else if (firstName) {
          formData.append("name", firstName);
        }

        const result = await signUp(formData);

        if (!result.success) {
          const code = result.error ?? "signUpFailed";
          setError(code);
          return { success: false, error: code };
        }

        startTransition(() => {
          router.refresh();
        });

        return { success: true, user: user ? { id: user.id, email: user.email } : undefined };
      } catch (err) {
        const code = thrownCode(err, "signUpFailed");
        pretty.error("[register] Failed", asError(err), { code });
        setError(code);
        return { success: false, error: code };
      } finally {
        setLoading(false);
      }
    },
    [router, user, clearErrorAction, setLoading, setError],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut();
      reset();
    } catch (err) {
      pretty.error("Logout error", err as Error);
    } finally {
      setLoading(false);
    }
  }, [reset, setLoading]);

  const recoverPassword = useCallback(
    async (email: string) => {
      clearErrorAction();

      try {
        const result = await resetPassword(email);

        if (!result.success) {
          const code = result.error ?? "passwordRecoveryFailed";
          setError(code);
          return { success: false, error: code };
        }

        return { success: true };
      } catch (err) {
        const code = thrownCode(err, "passwordRecoveryFailed");
        setError(code);
        return { success: false, error: code };
      }
    },
    [clearErrorAction, setError],
  );

  const handleUpdatePassword = useCallback(
    async (password: string) => {
      clearErrorAction();

      try {
        const formData = new FormData();
        formData.append("password", password);

        const result = await updatePassword(formData);

        if (!result.success) {
          const code = result.error ?? "passwordUpdateFailed";
          setError(code);
          return { success: false, error: code };
        }

        return { success: true };
      } catch (err) {
        const code = thrownCode(err, "passwordUpdateFailed");
        setError(code);
        return { success: false, error: code };
      }
    },
    [clearErrorAction, setError],
  );

  const checkSession = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setAuth(currentSession?.user ?? null, currentSession);
  }, [supabase, setAuth]);

  const clearError = useCallback(() => {
    clearErrorAction();
  }, [clearErrorAction]);

  // ========================================================================
  // Return Interface
  // ========================================================================

  const authUser: AuthUser | null = user ? { id: user.id, email: user.email } : null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return {
    // State
    isAuthenticated,
    isAdmin,
    adminCheckStatus,
    user: authUser,
    session,
    error,
    isLoading: isLoading || isPending,
    roles,

    // Actions
    loginWithPassword,
    loginWithOAuth,
    loginWithMagicLink,
    register,
    logout,
    recoverPassword,
    updatePassword: handleUpdatePassword,
    clearError,
    checkSession,

    // Backward compatibility aliases
    isAuth: isAuthenticated,
    authError: error,
    loginWithProvider: loginWithOAuth,
  };
}
