/**
 * useAuth Hook
 * Client-side authentication hook using Server Actions
 *
 * For Server Components, use getAuthSession() from '@/lib/data/auth' instead.
 * This hook is for Client Components that need auth state and actions.
 */

"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/zustand";
import {
  signInWithPassword,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
} from "@/app/actions/auth";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string | undefined;
}

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminCheckStatus: "idle" | "loading" | "succeeded" | "failed";
  user: AuthUser | null;
  session: Session | null;
  error: string | null;
  isLoading: boolean;
  roles: string[];

  // Actions
  loginWithPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithOAuth: (
    provider: "google" | "github" | "facebook" | "apple"
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    data: { email: string; password: string; firstName?: string; lastName?: string } | string,
    password?: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  checkSession: () => Promise<void>;

  // Backward compatibility aliases
  isAuth: boolean;
  authError: string | null;
  loginWithProvider: (
    provider: "google" | "github" | "facebook" | "apple"
  ) => Promise<{ success: boolean; error?: string }>;
}

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
          .select("role_id, roles!user_roles_role_id_fkey(name)")
          .eq("profile_id", userId);

        if (roleError) {
          console.error("[checkAdminStatus] Query error:", roleError);
          useAuthStore.getState().setAdminCheckStatus("failed");
          return;
        }

        const userRoles = (data ?? []).flatMap((r) => {
          const roleName = (r as { roles?: { name?: string } }).roles?.name;
          return roleName ? [roleName] : [];
        });

        const isUserAdmin = userRoles.includes("admin") || userRoles.includes("superadmin");

        // Use fresh reference to avoid stale closure
        useAuthStore.getState().setAdmin(isUserAdmin, userRoles);
      } catch (error) {
        console.error("[checkAdminStatus] Error:", error);
        useAuthStore.getState().setAdminCheckStatus("failed");
      }
    },
    [supabase] // Only supabase as dependency - Zustand actions accessed via getState()
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
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
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
      }
    );

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
          setError(result.error || "Login failed");
          return { success: false, error: result.error };
        }

        startTransition(() => {
          router.refresh();
        });

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [router, clearErrorAction, setLoading, setError]
  );

  const loginWithOAuth = useCallback(
    async (provider: "google" | "github" | "facebook" | "apple") => {
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
          setError(oauthError.message);
          return { success: false, error: oauthError.message };
        }

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "OAuth login failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [supabase, clearErrorAction, setError]
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
          setError(otpError.message);
          return { success: false, error: otpError.message };
        }

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Magic link failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [supabase, clearErrorAction, setError]
  );

  const register = useCallback(
    async (
      dataOrEmail:
        | { email: string; password: string; firstName?: string; lastName?: string }
        | string,
      passwordArg?: string,
      nameArg?: string
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
          setError(result.error || "Registration failed");
          return { success: false, error: result.error };
        }

        startTransition(() => {
          router.refresh();
        });

        return { success: true, user: user ? { id: user.id, email: user.email } : undefined };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Registration failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [router, user, clearErrorAction, setLoading, setError]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut();
      reset();
    } catch (err) {
      console.error("Logout error:", err);
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
          setError(result.error || "Password recovery failed");
          return { success: false, error: result.error };
        }

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Password recovery failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clearErrorAction, setError]
  );

  const handleUpdatePassword = useCallback(
    async (password: string) => {
      clearErrorAction();

      try {
        const formData = new FormData();
        formData.append("password", password);

        const result = await updatePassword(formData);

        if (!result.success) {
          setError(result.error || "Password update failed");
          return { success: false, error: result.error };
        }

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Password update failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clearErrorAction, setError]
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
