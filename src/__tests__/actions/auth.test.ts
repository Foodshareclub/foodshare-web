/**
 * Auth Server Actions Tests
 * Unit tests for authentication server actions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  session: null as { access_token: string; user: { id: string } } | null,
  profile: null as {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
    email: string;
  } | null,
  userRoles: null as Array<{ roles: { name: string } }> | null, // For user_roles junction table (array)
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
};

// Mock next/navigation - redirect throws to simulate Next.js behavior
mock.module("next/navigation", () => ({
  redirect: mock((url: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & { url: string };
    error.url = url;
    throw error;
  }),
}));

// Define chain type for Supabase mock
interface MockChain {
  eq: ReturnType<typeof mock>;
  in: ReturnType<typeof mock>;
  single: ReturnType<typeof mock>;
  maybeSingle: ReturnType<typeof mock>;
  then: (resolve: (value: unknown) => void) => void;
}

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => {
    // Thenable chain for database queries
    const createEqChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        eq: mock((): MockChain => createEqChain(tableName)),
        in: mock((): MockChain => createEqChain(tableName)),
        single: mock(() =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          })
        ),
        maybeSingle: mock(() =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          })
        ),
        // For user_roles table, the chain resolves to an array (not single)
        then: (resolve: (value: unknown) => void) =>
          resolve({
            // user_roles returns array of roles, profiles returns single profile
            data: tableName === "user_roles" ? mockState.userRoles : mockState.profile,
            error: mockState.dbError,
          }),
      };
      return chain;
    };

    return Promise.resolve({
      auth: {
        getSession: mock(() =>
          Promise.resolve({
            data: { session: mockState.session },
            error: mockState.authError,
          })
        ),
        getUser: mock(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
        signInWithPassword: mock(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          })
        ),
        signUp: mock(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          })
        ),
        signOut: mock(() => Promise.resolve({ error: mockState.authError })),
        resetPasswordForEmail: mock(() =>
          Promise.resolve({
            data: {},
            error: mockState.authError,
          })
        ),
        updateUser: mock(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
        signInWithOAuth: mock(() =>
          Promise.resolve({
            data: { url: "https://oauth.example.com/authorize" },
            error: mockState.authError,
          })
        ),
      },
      from: mock((tableName: string) => ({
        select: mock(() => ({
          eq: mock(() => createEqChain(tableName)),
        })),
        insert: mock(() =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          })
        ),
      })),
      storage: {
        from: mock(() => ({
          getPublicUrl: mock((path: string) => ({
            data: { publicUrl: `https://storage.example.com/${path}` },
          })),
        })),
      },
    });
  }),
  createCachedClient: mock(() => {
    return Promise.resolve({
      from: mock(() => ({
        select: mock(() => ({
          eq: mock(() => ({ single: mock(() => Promise.resolve({ data: null, error: null })) })),
        })),
      })),
    });
  }),
  createServerClient: mock(() => Promise.resolve({})),
}));

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
    mockState.user = null;
    mockState.session = null;
    mockState.profile = null;
    mockState.userRoles = null;
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
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await checkIsAdmin();

      expect(result).toBe(true);
    });

    it("should return true for superadmin user", async () => {
      mockState.user = { id: "super-123", email: "super@example.com" };
      mockState.userRoles = [{ roles: { name: "superadmin" } }];

      const result = await checkIsAdmin();

      expect(result).toBe(true);
    });

    it("should return false for regular user", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = []; // No admin role in user_roles junction table

      const result = await checkIsAdmin();

      expect(result).toBe(false);
    });

    it("should return false when not authenticated", async () => {
      mockState.user = null;
      mockState.userRoles = null;

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
      const formData = new FormData();
      formData.append("password", "123");

      const result = await updatePassword(formData);

      expect(result).toEqual({
        success: false,
        error: "Password must be at least 8 characters",
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
