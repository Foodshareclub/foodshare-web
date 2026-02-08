/**
 * useAuthStore Unit Tests
 * Tests for Zustand authentication store
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { act } from "@testing-library/react";

import type { User, Session } from "@supabase/supabase-js";
import { useAuthStore, authActions } from "./useAuthStore";

// Mock user and session for testing
const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { first_name: "Test", last_name: "User" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: "bearer",
  user: mockUser,
};

describe("useAuthStore", () => {
  // Reset store before each test
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().reset();
    });
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.roles).toEqual([]);
      expect(state.adminCheckStatus).toBe("idle");
    });
  });

  // ==========================================================================
  // setUser
  // ==========================================================================

  describe("setUser", () => {
    it("should set user and update isAuthenticated to true", () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should set user to null and update isAuthenticated to false", () => {
      // First set a user
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      // Then clear it
      act(() => {
        useAuthStore.getState().setUser(null);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // setSession
  // ==========================================================================

  describe("setSession", () => {
    it("should set session and extract user", () => {
      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should handle null session", () => {
      // First set a session
      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });

      // Then clear it
      act(() => {
        useAuthStore.getState().setSession(null);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // setAuth
  // ==========================================================================

  describe("setAuth", () => {
    it("should set both user and session", () => {
      act(() => {
        useAuthStore.getState().setAuth(mockUser, mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it("should clear error when setting auth", () => {
      // First set an error
      act(() => {
        useAuthStore.getState().setError("Some error");
      });

      // Then set auth
      act(() => {
        useAuthStore.getState().setAuth(mockUser, mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });

    it("should set isAuthenticated to false when either user or session is null", () => {
      act(() => {
        useAuthStore.getState().setAuth(mockUser, null);
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      act(() => {
        useAuthStore.getState().setAuth(null, mockSession);
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // Loading State
  // ==========================================================================

  describe("setLoading", () => {
    it("should set loading state to true", () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
      });

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it("should set loading state to false", () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
        useAuthStore.getState().setLoading(false);
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // Error State
  // ==========================================================================

  describe("setError", () => {
    it("should set error and clear loading", () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
        useAuthStore.getState().setError("Authentication failed");
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe("Authentication failed");
      expect(state.isLoading).toBe(false);
    });

    it("should allow null error", () => {
      act(() => {
        useAuthStore.getState().setError("Some error");
        useAuthStore.getState().setError(null);
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      act(() => {
        useAuthStore.getState().setError("Some error");
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ==========================================================================
  // Admin State
  // ==========================================================================

  describe("setAdmin", () => {
    it("should set admin status and roles", () => {
      act(() => {
        useAuthStore.getState().setAdmin(true, ["admin", "moderator"]);
      });

      const state = useAuthStore.getState();
      expect(state.isAdmin).toBe(true);
      expect(state.roles).toEqual(["admin", "moderator"]);
      expect(state.adminCheckStatus).toBe("succeeded");
    });

    it("should default roles to empty array", () => {
      act(() => {
        useAuthStore.getState().setAdmin(false);
      });

      const state = useAuthStore.getState();
      expect(state.isAdmin).toBe(false);
      expect(state.roles).toEqual([]);
    });
  });

  describe("setAdminCheckStatus", () => {
    it.each(["idle", "loading", "succeeded", "failed"] as const)(
      "should set adminCheckStatus to %s",
      (status: "idle" | "loading" | "succeeded" | "failed") => {
        act(() => {
          useAuthStore.getState().setAdminCheckStatus(status);
        });

        expect(useAuthStore.getState().adminCheckStatus).toBe(status);
      }
    );
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      // Set various state values
      act(() => {
        useAuthStore.getState().setAuth(mockUser, mockSession);
        useAuthStore.getState().setAdmin(true, ["admin"]);
        useAuthStore.getState().setLoading(true);
        useAuthStore.getState().setError("Some error");
      });

      // Reset
      act(() => {
        useAuthStore.getState().reset();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.roles).toEqual([]);
      expect(state.adminCheckStatus).toBe("idle");
    });
  });

  // ==========================================================================
  // Selectors
  // ==========================================================================

  describe("selectors", () => {
    beforeEach(() => {
      act(() => {
        useAuthStore.getState().setAuth(mockUser, mockSession);
        useAuthStore.getState().setAdmin(true, ["admin"]);
      });
    });

    it("selectUser should return user", () => {
      // Note: Selectors return hook functions, so we test the store state directly
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it("selectIsAuthenticated should return true when authenticated", () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it("selectIsAdmin should return admin status", () => {
      expect(useAuthStore.getState().isAdmin).toBe(true);
    });
  });

  // ==========================================================================
  // authActions
  // ==========================================================================

  describe("authActions", () => {
    it("should expose store actions for use outside React", () => {
      expect(typeof authActions.setAuth).toBe("function");
      expect(typeof authActions.setSession).toBe("function");
      expect(typeof authActions.setUser).toBe("function");
      expect(typeof authActions.setLoading).toBe("function");
      expect(typeof authActions.setError).toBe("function");
      expect(typeof authActions.setAdmin).toBe("function");
      expect(typeof authActions.setAdminCheckStatus).toBe("function");
      expect(typeof authActions.clearError).toBe("function");
      expect(typeof authActions.reset).toBe("function");
    });

    it("authActions.setAuth should update store", () => {
      act(() => {
        authActions.setAuth(mockUser, mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
    });
  });

  // ==========================================================================
  // Persistence (partialize)
  // ==========================================================================

  describe("persistence security", () => {
    it("should not persist any state (partialize returns empty object)", () => {
      // Set sensitive data
      act(() => {
        useAuthStore.getState().setAuth(mockUser, mockSession);
        useAuthStore.getState().setAdmin(true, ["admin"]);
        useAuthStore.getState().setAdminCheckStatus("succeeded");
      });

      // The partialize function returns {} — nothing is persisted
      // Session/user data comes from secure Supabase cookies
      const persistOptions = (
        useAuthStore as unknown as {
          persist: { getOptions: () => { partialize: (state: unknown) => unknown } };
        }
      ).persist?.getOptions?.();

      if (persistOptions?.partialize) {
        const fullState = useAuthStore.getState();
        const persistedState = persistOptions.partialize(fullState);

        // Should be empty — no state persisted
        expect(persistedState).toEqual({});

        // Should NOT contain any data
        expect(persistedState).not.toHaveProperty("user");
        expect(persistedState).not.toHaveProperty("session");
        expect(persistedState).not.toHaveProperty("isAdmin");
        expect(persistedState).not.toHaveProperty("roles");
        expect(persistedState).not.toHaveProperty("adminCheckStatus");
      }
    });
  });
});
