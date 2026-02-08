/**
 * Auth Flow Integration Tests
 * Tests authentication hook interface and behavior
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// Create a shared mock state
const mockAuthState = {
  session: null as unknown,
  user: null as unknown,
};

// Mock Zustand store state — actions update state so waitFor works
const mockAuthStoreState = {
  user: null as unknown,
  session: null as unknown,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  isAdmin: false,
  roles: [] as string[],
  adminCheckStatus: "idle" as "idle" | "loading" | "succeeded" | "failed",
  setUser: (user: unknown) => {
    mockAuthStoreState.user = user;
    mockAuthStoreState.isAuthenticated = !!user;
  },
  setSession: (session: unknown) => {
    mockAuthStoreState.session = session;
  },
  setAuth: (user: unknown, session: unknown) => {
    mockAuthStoreState.user = user;
    mockAuthStoreState.session = session;
    mockAuthStoreState.isAuthenticated = !!user && !!session;
    mockAuthStoreState.error = null;
  },
  setLoading: (loading: boolean) => {
    mockAuthStoreState.isLoading = loading;
  },
  setError: (error: string | null) => {
    mockAuthStoreState.error = error;
    mockAuthStoreState.isLoading = false;
  },
  setAdmin: (isAdmin: boolean, roles: string[] = []) => {
    mockAuthStoreState.isAdmin = isAdmin;
    mockAuthStoreState.roles = roles;
    mockAuthStoreState.adminCheckStatus = "succeeded";
  },
  setAdminCheckStatus: (status: string) => {
    mockAuthStoreState.adminCheckStatus = status as "idle" | "loading" | "succeeded" | "failed";
  },
  clearError: () => {
    mockAuthStoreState.error = null;
  },
  reset: () => {
    Object.assign(mockAuthStoreState, {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAdmin: false,
      roles: [],
      adminCheckStatus: "idle",
    });
  },
};

// Mock modules using bun:test mock.module
const mockSignInWithPassword = mock(() => Promise.resolve({ success: true }));
const mockSignUp = mock(() => Promise.resolve({ success: true }));

mock.module("@/app/actions/auth", () => ({
  signInWithPassword: mockSignInWithPassword,
  signUp: mockSignUp,
  signOut: mock(() => Promise.resolve()),
  resetPassword: mock(() => Promise.resolve({ success: true })),
  updatePassword: mock(() => Promise.resolve({ success: true })),
}));

mock.module("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockAuthState.session }, error: null }),
      getUser: () => Promise.resolve({ data: { user: mockAuthState.user }, error: null }),
      signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: {}, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

mock.module("@/store/zustand", () => {
  const mockStore = (selector?: (state: typeof mockAuthStoreState) => unknown) => {
    if (typeof selector === "function") return selector(mockAuthStoreState);
    return mockAuthStoreState;
  };
  mockStore.getState = () => mockAuthStoreState;
  return { useAuthStore: mockStore };
});

import { useAuth } from "@/hooks/useAuth";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

describe("Auth Flow Integration Tests", () => {
  beforeEach(() => {
    mockAuthState.session = null;
    mockAuthState.user = null;
    mockAuthStoreState.reset();
    mockSignInWithPassword.mockImplementation(() => Promise.resolve({ success: true }));
    mockSignUp.mockImplementation(() => Promise.resolve({ success: true }));
  });

  describe("Hook Interface", () => {
    it("should expose all required auth methods", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(typeof result.current.loginWithPassword).toBe("function");
      expect(typeof result.current.register).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.recoverPassword).toBe("function");
      expect(typeof result.current.updatePassword).toBe("function");
      expect(typeof result.current.checkSession).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });

    it("should expose auth state properties", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect("isAuthenticated" in result.current).toBe(true);
      expect("isLoading" in result.current).toBe(true);
      expect("user" in result.current).toBe(true);
      expect("session" in result.current).toBe(true);
      expect("error" in result.current).toBe(true);
    });
  });

  describe("Initial Auth State", () => {
    it("should start with unauthenticated state when no session", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it("should have loading state initially when configured", () => {
      mockAuthStoreState.isLoading = true;
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("Login with Password Flow", () => {
    it("should return failure result on invalid credentials", async () => {
      mockSignInWithPassword.mockImplementation(() =>
        Promise.resolve({ success: false, error: "Invalid login credentials" })
      );

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.loginWithPassword("test@example.com", "wrongpassword");
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBeDefined();
    });

    it("should call Server Action", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.loginWithPassword("test@example.com", "password123");
      });

      expect(mockSignInWithPassword).toHaveBeenCalled();
    });
  });

  describe("Registration Flow", () => {
    it("should return failure result on registration error", async () => {
      mockSignUp.mockImplementation(() =>
        Promise.resolve({ success: false, error: "User already registered" })
      );

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      let registerResult: { success: boolean; error?: string };
      await act(async () => {
        registerResult = await result.current.register({
          email: "existing@example.com",
          password: "password123",
        });
      });

      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBeDefined();
    });

    it("should accept registration options without throwing", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.register({
          email: "newuser@example.com",
          password: "password123",
        });
      });

      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  describe("Logout Flow", () => {
    it("should have logout function available", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(typeof result.current.logout).toBe("function");
    });
  });

  describe("Password Recovery Flow", () => {
    it("should have recoverPassword method available", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(typeof result.current.recoverPassword).toBe("function");
    });

    it("should have updatePassword method available", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(typeof result.current.updatePassword).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should have clearError method that can be called", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();
    });

    it("should show unauthenticated state by default", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("Session Management", () => {
    it("should have checkSession method available", () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });
      expect(typeof result.current.checkSession).toBe("function");
    });

    it("should be able to call checkSession", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.checkSession();
      });

      // After checking session with null mock, should remain unauthenticated
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
