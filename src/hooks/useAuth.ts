/**
 * useAuth Hook
 * Client-side authentication hook using Server Actions
 *
 * For Server Components, use getAuthSession() from '@/lib/data/auth' instead.
 * This hook is for Client Components that need auth state and actions.
 */

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
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

  // Local state for auth
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand for admin state (persisted across components)
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const roles = useAuthStore((state) => state.roles);
  const adminCheckStatus = useAuthStore((state) => state.adminCheckStatus);
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const setAdminCheckStatus = useAuthStore((state) => state.setAdminCheckStatus);
  const reset = useAuthStore((state) => state.reset);

  // ========================================================================
  // Admin Check
  // ========================================================================

  const checkAdminStatus = useCallback(
    async (userId: string) => {
      setAdminCheckStatus("loading");
      try {
        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role_id, roles!user_roles_role_id_fkey(name)")
          .eq("profile_id", userId);

        if (roleError) {
          setAdminCheckStatus("failed");
          return;
        }

        const userRoles = (data ?? []).flatMap((r) => {
          const roleName = (r as { roles?: { name?: string } }).roles?.name;
          return roleName ? [roleName] : [];
        });

        const isUserAdmin = userRoles.includes("admin") || userRoles.includes("superadmin");
        setAdmin(isUserAdmin, userRoles);
      } catch {
        setAdminCheckStatus("failed");
      }
    },
    [supabase, setAdminCheckStatus, setAdmin]
  );

  // ========================================================================
  // Auth State Listener
  // ========================================================================

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Check admin status if user exists
        if (initialSession?.user) {
          await checkAdminStatus(initialSession.user.id);
        }
      } catch (err) {
        console.error("Error getting initial session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await checkAdminStatus(newSession.user.id);
        } else {
          reset();
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
  }, [supabase, router, reset, checkAdminStatus]);

  // ========================================================================
  // Auth Actions
  // ========================================================================

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);

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
        setIsLoading(false);
      }
    },
    [router]
  );

  const loginWithOAuth = useCallback(
    async (provider: "google" | "github" | "facebook" | "apple") => {
      setError(null);

      try {
        // Use browser client directly for OAuth - this ensures same-tab redirect
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
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
    [supabase]
  );

  const loginWithMagicLink = useCallback(
    async (email: string) => {
      setError(null);

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
    [supabase]
  );

  const register = useCallback(
    async (
      dataOrEmail:
        | { email: string; password: string; firstName?: string; lastName?: string }
        | string,
      passwordArg?: string,
      nameArg?: string
    ) => {
      setError(null);
      setIsLoading(true);

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
        setIsLoading(false);
      }
    },
    [router, user]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      reset();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  const recoverPassword = useCallback(async (email: string) => {
    setError(null);

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
  }, []);

  const handleUpdatePassword = useCallback(async (password: string) => {
    setError(null);

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
  }, []);

  const checkSession = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
  }, [supabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ========================================================================
  // Return Interface
  // ========================================================================

  const authUser: AuthUser | null = user ? { id: user.id, email: user.email } : null;
  const isAuthenticated = !!session;

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
