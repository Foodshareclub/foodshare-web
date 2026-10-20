/**
 * Auth Store (Zustand)
 * Manages authentication state with React Query for async operations
 * Replaces Redux auth slice following ultrathink principles
 */

import type { AuthErrorCode } from "@/lib/errors";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

type AdminCheckStatus = "idle" | "loading" | "succeeded" | "failed";

interface AuthState {
  // Core auth state
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;

  // Loading and error states
  isLoading: boolean;
  /**
   * An `AuthErrorCode`, never a message.
   *
   * Nothing is persisted (`partialize` returns `{}`), so this is a per-session
   * value and the change of domain is free of migration concerns. It matters
   * that it is a code: the store is read by the login page and by the auth
   * modal, and a string here is a string somebody eventually renders.
   */
  error: AuthErrorCode | null;

  // Admin state
  isAdmin: boolean;
  roles: string[];
  adminCheckStatus: AdminCheckStatus;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAuth: (user: User | null, session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthErrorCode | null) => void;
  setAdmin: (isAdmin: boolean, roles?: string[]) => void;
  setAdminCheckStatus: (status: AdminCheckStatus) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isAdmin: false,
  roles: [],
  adminCheckStatus: "idle" as AdminCheckStatus,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      // Set user
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      // Set session
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        }),

      // Set both user and session
      setAuth: (user, session) =>
        set({
          user,
          session,
          isAuthenticated: !!session && !!user,
          error: null,
        }),

      // Loading state
      setLoading: (isLoading) => set({ isLoading }),

      // Error state
      setError: (error) => set({ error, isLoading: false }),

      // Clear error
      clearError: () => set({ error: null }),

      // Set admin status
      setAdmin: (isAdmin, roles = []) =>
        set({
          isAdmin,
          roles,
          adminCheckStatus: "succeeded",
        }),

      // Set admin check status
      setAdminCheckStatus: (adminCheckStatus) => set({ adminCheckStatus }),

      // Reset all state
      reset: () => set(initialState),
    }),
    {
      name: "foodshare-auth-store",
      storage: createJSONStorage(() => {
        // SSR-safe storage
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // SECURITY: Don't persist any auth state
      // Session/user data should come from secure Supabase cookies
      // Never persist: user, session, isAdmin, roles, adminCheckStatus
      // Note: Previously adminCheckStatus was persisted, but this caused a bug
      // where the check was skipped on page reload while isAdmin remained false
      partialize: () => ({}),
    },
  ),
);

// ============================================================================
// Selectors (pure functions for use with useAuthStore)
// ============================================================================

export const selectUser = (state: AuthState) => state.user;
export const selectSession = (state: AuthState) => state.session;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsAdmin = (state: AuthState) => state.isAdmin;
export const selectRoles = (state: AuthState) => state.roles;
export const selectAuthError = (state: AuthState) => state.error;
export const selectAuthLoading = (state: AuthState) => state.isLoading;
export const selectAdminCheckStatus = (state: AuthState) => state.adminCheckStatus;

// Computed selectors
export const selectUserId = (state: AuthState) => state.user?.id;
export const selectUserEmail = (state: AuthState) => state.user?.email;

// ============================================================================
// Custom Hooks (convenience hooks for common selections)
// ============================================================================

export const useUser = () => useAuthStore(selectUser);
export const useSession = () => useAuthStore(selectSession);
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);
export const useIsAdmin = () => useAuthStore(selectIsAdmin);
export const useRoles = () => useAuthStore(selectRoles);
export const useAuthError = () => useAuthStore(selectAuthError);
export const useAuthLoading = () => useAuthStore(selectAuthLoading);
export const useAdminCheckStatus = () => useAuthStore(selectAdminCheckStatus);
export const useUserId = () => useAuthStore(selectUserId);
export const useUserEmail = () => useAuthStore(selectUserEmail);

// ============================================================================
// Actions (for use outside of React components)
// ============================================================================

export const authActions = {
  setAuth: useAuthStore.getState().setAuth,
  setSession: useAuthStore.getState().setSession,
  setUser: useAuthStore.getState().setUser,
  setLoading: useAuthStore.getState().setLoading,
  setError: useAuthStore.getState().setError,
  setAdmin: useAuthStore.getState().setAdmin,
  setAdminCheckStatus: useAuthStore.getState().setAdminCheckStatus,
  clearError: useAuthStore.getState().clearError,
  reset: useAuthStore.getState().reset,
};
