/**
 * Auth Queries (TanStack Query)
 * Handles authentication state and operations
 * Syncs with Zustand auth store for global state
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/zustand";
import type { User, Session, Provider } from "@supabase/supabase-js";

// ============================================================================
// Query Keys
// ============================================================================

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  user: () => [...authKeys.all, "user"] as const,
  admin: (userId: string) => [...authKeys.all, "admin", userId] as const,
};

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface OtpCredentials {
  email: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current auth session
 * Syncs with Zustand store for global access
 */
export function useSession(
  options?: Omit<UseQueryOptions<AuthState, Error>, "queryKey" | "queryFn">
) {
  const setAuth = useAuthStore((state) => state.setAuth);

  const query = useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthState> => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      return {
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
      };
    },
    staleTime: Infinity, // Session doesn't go stale
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    ...options,
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.data) {
      setAuth(query.data.user, query.data.session);
    }
  }, [query.data, setAuth]);

  return query;
}

/**
 * Check if user is admin
 * Syncs admin status with Zustand store
 */
export function useIsAdmin(userId: string | undefined) {
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const setAdminCheckStatus = useAuthStore((state) => state.setAdminCheckStatus);

  const query = useQuery({
    queryKey: authKeys.admin(userId ?? ""),
    queryFn: async () => {
      if (!userId) return { isAdmin: false, roles: [] as string[] };

      const { data, error } = await supabase
        .from("user_roles")
        .select("role_id, roles!user_roles_role_id_fkey(name)")
        .eq("profile_id", userId);

      if (error) {
        // If no roles found or table access issue, return empty roles
        console.warn("Error fetching user roles:", error.message);
        return { isAdmin: false, roles: [] as string[] };
      }

      const roles = (data ?? []).flatMap((r) => {
        const roleName = (r as { roles?: { name?: string } }).roles?.name;
        return roleName ? [roleName] : [];
      });
      return {
        isAdmin: roles.includes("admin"),
        roles,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.status === "pending") {
      setAdminCheckStatus("loading");
    } else if (query.status === "error") {
      setAdminCheckStatus("failed");
    } else if (query.data) {
      setAdmin(query.data.isAdmin, query.data.roles);
    }
  }, [query.data, query.status, setAdmin, setAdminCheckStatus]);

  return query;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Sign in with email/password
 */
export function useSignIn() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: async ({ email, password }: SignInCredentials) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.session);
      queryClient.setQueryData(authKeys.session(), {
        user: data.user,
        session: data.session,
        isAuthenticated: true,
      });
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

/**
 * Sign up with email/password
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password, firstName, lastName }: SignUpCredentials) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.session) {
        queryClient.setQueryData(authKeys.session(), {
          user: data.user,
          session: data.session,
          isAuthenticated: true,
        });
      }
    },
  });
}

/**
 * Sign in with OAuth provider
 */
export function useSignInWithProvider() {
  return useMutation({
    mutationFn: async (provider: Provider) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Sign in with OTP (magic link)
 */
export function useSignInWithOtp() {
  return useMutation({
    mutationFn: async ({ email }: OtpCredentials) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Sign out
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Reset Zustand auth store
      reset();
      // Clear all auth-related queries
      queryClient.setQueryData(authKeys.session(), {
        user: null,
        session: null,
        isAuthenticated: false,
      });
      // Clear all cached data on logout
      queryClient.clear();
    },
  });
}

/**
 * Request password reset
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Update password
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined auth hook for easy access
 */
export function useAuth() {
  const { data: authState, isLoading, error } = useSession();
  const { data: adminData } = useIsAdmin(authState?.user?.id);

  const signIn = useSignIn();
  const signUp = useSignUp();
  const signOut = useSignOut();
  const signInWithProvider = useSignInWithProvider();
  const signInWithOtp = useSignInWithOtp();
  const requestPasswordReset = useRequestPasswordReset();
  const updatePassword = useUpdatePassword();

  return {
    // State
    user: authState?.user ?? null,
    session: authState?.session ?? null,
    isAuthenticated: authState?.isAuthenticated ?? false,
    isAdmin: adminData?.isAdmin ?? false,
    roles: adminData?.roles ?? [],
    isLoading,
    error,

    // Mutations
    signIn: signIn.mutateAsync,
    signUp: signUp.mutateAsync,
    signOut: signOut.mutateAsync,
    signInWithProvider: signInWithProvider.mutateAsync,
    signInWithOtp: signInWithOtp.mutateAsync,
    requestPasswordReset: requestPasswordReset.mutateAsync,
    updatePassword: updatePassword.mutateAsync,

    // Mutation states
    isSigningIn: signIn.isPending,
    isSigningUp: signUp.isPending,
    isSigningOut: signOut.isPending,
  };
}
