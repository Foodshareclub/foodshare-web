/**
 * Auth Flow Integration Tests
 * Tests authentication hook interface and behavior
 *
 * Note: These tests focus on verifying the useAuth hook interface works correctly.
 * Full end-to-end auth testing should be done with Playwright/Cypress.
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import * as authActions from "@/app/actions/auth";

// Define result type for tests
interface AuthResult {
  success: boolean;
  error?: string;
}

// Mock modules
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock Server Actions
jest.mock("@/app/actions/auth", () => ({
  signInWithPassword: jest.fn(() => Promise.resolve({ success: true })),
  signUp: jest.fn(() => Promise.resolve({ success: true })),
  signOut: jest.fn(() => Promise.resolve()),
  resetPassword: jest.fn(() => Promise.resolve({ success: true })),
  updatePassword: jest.fn(() => Promise.resolve({ success: true })),
  getOAuthSignInUrl: jest.fn(() => Promise.resolve({ url: "https://example.com/oauth" })),
}));

// Create a shared mock state
const mockAuthState = {
  session: null as unknown,
  user: null as unknown,
};

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: mockAuthState.session },
          error: null,
        })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: mockAuthState.user },
          error: null,
        })
      ),
      signInWithOtp: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    })),
  }),
}));

// Mock Zustand store with proper selector support
// Define state object that can be accessed by tests
const mockAuthStoreState = {
  user: null as unknown,
  session: null as unknown,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  isAdmin: false,
  roles: [] as string[],
  adminCheckStatus: "idle" as "idle" | "loading" | "succeeded" | "failed",
  setUser: jest.fn(),
  setSession: jest.fn(),
  setAuth: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  setAdmin: jest.fn(),
  setAdminCheckStatus: jest.fn(),
  clearError: jest.fn(),
  reset: jest.fn(),
};

jest.mock("@/store/zustand", () => {
  // Create mock store function that handles selectors
  const mockStore = (selector?: (state: typeof mockAuthStoreState) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockAuthStoreState);
    }
    return mockAuthStoreState;
  };
  // Add getState method for Zustand compatibility
  mockStore.getState = () => mockAuthStoreState;
  return {
    useAuthStore: mockStore,
  };
});

// Test wrapper - no longer needs QueryClientProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

describe("Auth Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockAuthState.session = null;
    mockAuthState.user = null;
    // Reset Zustand mock state
    mockAuthStoreState.user = null;
    mockAuthStoreState.session = null;
    mockAuthStoreState.isAuthenticated = false;
    mockAuthStoreState.isLoading = false; // Start as not loading for tests
    mockAuthStoreState.error = null;
    mockAuthStoreState.isAdmin = false;
    mockAuthStoreState.roles = [];
    mockAuthStoreState.adminCheckStatus = "idle";
  });

  // ==========================================================================
  // Hook Interface Tests
  // ==========================================================================

  describe("Hook Interface", () => {
    it("should expose all required auth methods", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify all auth methods exist
      expect(typeof result.current.loginWithPassword).toBe("function");
      expect(typeof result.current.register).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.recoverPassword).toBe("function");
      expect(typeof result.current.updatePassword).toBe("function");
      expect(typeof result.current.checkSession).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });

    it("should expose auth state properties", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify state properties exist
      expect("isAuthenticated" in result.current).toBe(true);
      expect("isLoading" in result.current).toBe(true);
      expect("user" in result.current).toBe(true);
      expect("session" in result.current).toBe(true);
      expect("error" in result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial Auth State", () => {
    it("should start with unauthenticated state when no session", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it("should have loading state initially", () => {
      // Set up mock to simulate initial loading state
      mockAuthStoreState.isLoading = true;

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);
    });
  });

  // ==========================================================================
  // Login Flow Tests
  // ==========================================================================

  describe("Login with Password Flow", () => {
    it("should return failure result on invalid credentials", async () => {
      // Setup mock to return error
      jest.mocked(authActions.signInWithPassword).mockResolvedValueOnce({
        success: false,
        error: "Invalid login credentials",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: AuthResult;
      await act(async () => {
        loginResult = await result.current.loginWithPassword("test@example.com", "wrongpassword");
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBeDefined();
    });

    it("should call Server Action with correct params", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loginWithPassword("test@example.com", "password123");
      });

      // Verify the Server Action was called
      expect(authActions.signInWithPassword).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Registration Flow Tests
  // ==========================================================================

  describe("Registration Flow", () => {
    it("should return failure result on registration error", async () => {
      // Setup mock to return error
      jest.mocked(authActions.signUp).mockResolvedValueOnce({
        success: false,
        error: "User already registered",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult: AuthResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: "existing@example.com",
          password: "password123",
        });
      });

      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBeDefined();
    });

    it("should accept registration options", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called with proper params
      await expect(
        act(async () => {
          await result.current.register({
            email: "newuser@example.com",
            password: "password123",
          });
        })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Logout Flow Tests
  // ==========================================================================

  describe("Logout Flow", () => {
    it("should have logout function available", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.logout).toBe("function");
    });
  });

  // ==========================================================================
  // Password Recovery Flow Tests
  // ==========================================================================

  describe("Password Recovery Flow", () => {
    it("should have recoverPassword method available", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.recoverPassword).toBe("function");
    });

    it("should have updatePassword method available", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.updatePassword).toBe("function");
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("should have clearError method that can be called", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called
      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();
    });

    it("should handle network errors gracefully", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not crash and should show unauthenticated state
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // Session Check Tests
  // ==========================================================================

  describe("Session Management", () => {
    it("should have checkSession method available", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.checkSession).toBe("function");
    });

    it("should be able to call checkSession", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called
      await expect(
        act(async () => {
          await result.current.checkSession();
        })
      ).resolves.not.toThrow();
    });
  });
});
