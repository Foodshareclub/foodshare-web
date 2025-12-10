/**
 * Auth Server Actions Tests
 * Unit tests for authentication server actions
 */

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  session: null as { access_token: string; user: { id: string } } | null,
  profile: null as {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
    role: Record<string, boolean> | null;
    email: string;
  } | null,
  userRole: null as { roles: { name: string } } | null, // For user_roles junction table
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
};

// Mock next/navigation - redirect throws to simulate Next.js behavior
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & { url: string };
    error.url = url;
    throw error;
  }),
}));

// Define chain type for Supabase mock
interface MockChain {
  eq: jest.Mock;
  in: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: (resolve: (value: unknown) => void) => void;
}

// Mock Supabase server
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => {
    // Thenable chain for database queries
    const createEqChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        eq: jest.fn((): MockChain => createEqChain(tableName)),
        in: jest.fn((): MockChain => createEqChain(tableName)),
        single: jest.fn(() =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          })
        ),
        maybeSingle: jest.fn(() =>
          Promise.resolve({
            // For user_roles table, return userRole data
            data: tableName === "user_roles" ? mockState.userRole : mockState.profile,
            error: mockState.dbError,
          })
        ),
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: mockState.profile,
            error: mockState.dbError,
          }),
      };
      return chain;
    };

    return Promise.resolve({
      auth: {
        getSession: jest.fn(() =>
          Promise.resolve({
            data: { session: mockState.session },
            error: mockState.authError,
          })
        ),
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
        signInWithPassword: jest.fn(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          })
        ),
        signUp: jest.fn(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          })
        ),
        signOut: jest.fn(() => Promise.resolve({ error: mockState.authError })),
        resetPasswordForEmail: jest.fn(() =>
          Promise.resolve({
            data: {},
            error: mockState.authError,
          })
        ),
        updateUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
        signInWithOAuth: jest.fn(() =>
          Promise.resolve({
            data: { url: "https://oauth.example.com/authorize" },
            error: mockState.authError,
          })
        ),
      },
      from: jest.fn((tableName: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => createEqChain(tableName)),
        })),
        insert: jest.fn(() =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          })
        ),
      })),
      storage: {
        from: jest.fn(() => ({
          getPublicUrl: jest.fn((path: string) => ({
            data: { publicUrl: `https://storage.example.com/${path}` },
          })),
        })),
      },
    });
  }),
}));

import { describe, it, expect, beforeEach } from "@jest/globals";

// Import actions after mocks
import {
  getSession,
  getUser,
  checkIsAdmin,
  signInWithPassword,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
  getOAuthSignInUrl,
} from "@/app/actions/auth";

describe("Auth Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.user = null;
    mockState.session = null;
    mockState.profile = null;
    mockState.userRole = null;
    mockState.authError = null;
    mockState.dbError = null;
  });

  // ==========================================================================
  // getSession Tests
  // ==========================================================================

  describe("getSession", () => {
    it("should return session when authenticated", async () => {
      mockState.session = {
        access_token: "test-token",
        user: { id: "user-123" },
      };

      const result = await getSession();

      expect(result).toEqual(mockState.session);
    });

    it("should return null when not authenticated", async () => {
      mockState.session = null;

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getUser Tests
  // ==========================================================================

  describe("getUser", () => {
    it("should return user with profile when authenticated", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };
      mockState.profile = {
        id: "user-123",
        first_name: "Test",
        second_name: "User",
        avatar_url: null,
        role: null,
        email: "test@example.com",
      };

      const result = await getUser();

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        profile: {
          id: "user-123",
          first_name: "Test",
          second_name: "User",
          avatar_url: null,
          role: null,
          email: "test@example.com",
        },
      });
    });

    it("should return null when not authenticated", async () => {
      mockState.user = null;

      const result = await getUser();

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // checkIsAdmin Tests
  // ==========================================================================

  describe("checkIsAdmin", () => {
    it("should return true for admin user", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRole = { roles: { name: "admin" } };

      const result = await checkIsAdmin();

      expect(result).toBe(true);
    });

    it("should return true for superadmin user", async () => {
      mockState.user = { id: "super-123", email: "super@example.com" };
      mockState.userRole = { roles: { name: "superadmin" } };

      const result = await checkIsAdmin();

      expect(result).toBe(true);
    });

    it("should return false for regular user", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRole = null; // No admin role in user_roles junction table

      const result = await checkIsAdmin();

      expect(result).toBe(false);
    });

    it("should return false when not authenticated", async () => {
      mockState.user = null;
      mockState.userRole = null;

      const result = await checkIsAdmin();

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // signInWithPassword Tests
  // ==========================================================================

  describe("signInWithPassword", () => {
    it("should return success on valid credentials", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };
      mockState.session = { access_token: "token", user: { id: "user-123" } };

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const result = await signInWithPassword(formData);

      expect(result).toEqual({ success: true });
    });

    it("should return error on invalid credentials", async () => {
      mockState.authError = { message: "Invalid login credentials" };

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrong");

      const result = await signInWithPassword(formData);

      expect(result).toEqual({
        success: false,
        error: "Invalid login credentials",
      });
    });
  });

  // ==========================================================================
  // signUp Tests
  // ==========================================================================

  describe("signUp", () => {
    it("should return success on valid signup", async () => {
      mockState.user = { id: "new-user-123", email: "new@example.com" };

      const formData = new FormData();
      formData.append("email", "new@example.com");
      formData.append("password", "password123");
      formData.append("name", "New User");

      const result = await signUp(formData);

      expect(result).toEqual({ success: true });
    });

    it("should return error when email already exists", async () => {
      mockState.authError = { message: "User already registered" };

      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");
      formData.append("name", "Existing User");

      const result = await signUp(formData);

      expect(result).toEqual({
        success: false,
        error: "User already registered",
      });
    });
  });

  // ==========================================================================
  // signOut Tests
  // ==========================================================================

  describe("signOut", () => {
    it("should sign out and redirect to home", async () => {
      try {
        await signOut();
        fail("Expected signOut to throw NEXT_REDIRECT");
      } catch (error) {
        expect((error as Error).message).toBe("NEXT_REDIRECT");
        expect((error as Error & { url: string }).url).toBe("/");
      }
    });
  });

  // ==========================================================================
  // resetPassword Tests
  // ==========================================================================

  describe("resetPassword", () => {
    it("should return success when email sent", async () => {
      const result = await resetPassword("test@example.com");

      expect(result).toEqual({ success: true });
    });

    it("should return error when email not found", async () => {
      mockState.authError = { message: "User not found" };

      const result = await resetPassword("nonexistent@example.com");

      expect(result).toEqual({
        success: false,
        error: "User not found",
      });
    });
  });

  // ==========================================================================
  // updatePassword Tests
  // ==========================================================================

  describe("updatePassword", () => {
    it("should return success on valid password update", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };

      const formData = new FormData();
      formData.append("password", "newPassword123");

      const result = await updatePassword(formData);

      expect(result).toEqual({ success: true });
    });

    it("should return error on invalid password", async () => {
      mockState.authError = { message: "Password is too weak" };

      const formData = new FormData();
      formData.append("password", "123");

      const result = await updatePassword(formData);

      expect(result).toEqual({
        success: false,
        error: "Password is too weak",
      });
    });
  });

  // ==========================================================================
  // getOAuthSignInUrl Tests
  // ==========================================================================

  describe("getOAuthSignInUrl", () => {
    it("should return OAuth URL for Google", async () => {
      const result = await getOAuthSignInUrl("google");

      expect(result).toEqual({ url: "https://oauth.example.com/authorize" });
    });

    it("should return error on OAuth failure", async () => {
      mockState.authError = { message: "OAuth provider not configured" };

      const result = await getOAuthSignInUrl("github");

      expect(result).toEqual({
        url: null,
        error: "OAuth provider not configured",
      });
    });
  });
});
