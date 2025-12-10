/**
 * useAuthQueries Unit Tests
 * Tests for TanStack Query authentication hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useSession,
  useIsAdmin,
  useSignIn,
  useSignUp,
  useSignOut,
  authKeys,
} from "./useAuthQueries";
import { useAuthStore } from "@/store/zustand";
import { supabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithOtp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

// Mock user and session
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

// Test wrapper with QueryClientProvider
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("authKeys", () => {
  it("should generate correct query keys", () => {
    expect(authKeys.all).toEqual(["auth"]);
    expect(authKeys.session()).toEqual(["auth", "session"]);
    expect(authKeys.user()).toEqual(["auth", "user"]);
    expect(authKeys.admin("user-123")).toEqual(["auth", "admin", "user-123"]);
  });
});

describe("useSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it("should fetch session successfully", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      user: mockUser,
      session: mockSession,
      isAuthenticated: true,
    });
  });

  it("should return null user when no session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  });

  it("should handle session fetch error", async () => {
    const error = new Error("Session fetch failed");
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
      error,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it("should sync session to Zustand store", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    renderHook(() => useSession(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      const store = useAuthStore.getState();
      expect(store.user).toEqual(mockUser);
      expect(store.session).toEqual(mockSession);
    });
  });
});

describe("useIsAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it("should return isAdmin false when no userId", async () => {
    const { result } = renderHook(() => useIsAdmin(undefined), {
      wrapper: createTestWrapper(),
    });

    // Query should not run when userId is undefined
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("should fetch admin status successfully", async () => {
    const mockRoles = [
      { role_id: 1, roles: { name: "admin" } },
      { role_id: 2, roles: { name: "moderator" } },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const { result } = renderHook(() => useIsAdmin("user-123"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      isAdmin: true,
      roles: ["admin", "moderator"],
    });
  });

  it("should return isAdmin false when user has no admin role", async () => {
    const mockRoles = [{ role_id: 2, roles: { name: "user" } }];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    const { result } = renderHook(() => useIsAdmin("user-123"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.isAdmin).toBe(false);
    expect(result.current.data?.roles).toEqual(["user"]);
  });

  it("should sync admin status to Zustand store", async () => {
    const mockRoles = [{ role_id: 1, roles: { name: "admin" } }];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockRoles,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    renderHook(() => useIsAdmin("user-123"), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      const store = useAuthStore.getState();
      expect(store.isAdmin).toBe(true);
      expect(store.roles).toEqual(["admin"]);
      expect(store.adminCheckStatus).toBe("succeeded");
    });
  });
});

describe("useSignIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it("should sign in successfully", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync({
      email: "test@example.com",
      password: "password123",
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });

    // Check Zustand store was updated
    const store = useAuthStore.getState();
    expect(store.user).toEqual(mockUser);
    expect(store.session).toEqual(mockSession);
  });

  it("should handle sign in error", async () => {
    const error = new Error("Invalid credentials");
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error,
    });

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        email: "test@example.com",
        password: "wrong",
      })
    ).rejects.toThrow("Invalid credentials");

    // Check error was set in store
    const store = useAuthStore.getState();
    expect(store.error).toBe("Invalid credentials");
  });

  it("should set loading state during sign in", async () => {
    let resolveSignIn: (value: unknown) => void;
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });

    (supabase.auth.signInWithPassword as jest.Mock).mockReturnValueOnce(signInPromise);

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createTestWrapper(),
    });

    // Start the mutation
    const mutationPromise = result.current.mutateAsync({
      email: "test@example.com",
      password: "password123",
    });

    // Loading should be true immediately
    await waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    // Resolve the sign in
    resolveSignIn!({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    await mutationPromise;

    // Loading should be false after completion
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe("useSignUp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it("should sign up successfully", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useSignUp(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync({
      email: "new@example.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        data: {
          first_name: "New",
          last_name: "User",
        },
      },
    });
  });

  it("should handle sign up error", async () => {
    const error = new Error("Email already exists");
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error,
    });

    const { result } = renderHook(() => useSignUp(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        email: "existing@example.com",
        password: "password123",
      })
    ).rejects.toThrow("Email already exists");
  });
});

describe("useSignOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up authenticated state
    useAuthStore.getState().setAuth(mockUser, mockSession);
    useAuthStore.getState().setAdmin(true, ["admin"]);
  });

  it("should sign out successfully and reset store", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
      error: null,
    });

    const { result } = renderHook(() => useSignOut(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync();

    expect(supabase.auth.signOut).toHaveBeenCalled();

    // Check store was reset
    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.session).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isAdmin).toBe(false);
  });

  it("should handle sign out error", async () => {
    const error = new Error("Sign out failed");
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
      error,
    });

    const { result } = renderHook(() => useSignOut(), {
      wrapper: createTestWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow("Sign out failed");
  });
});
