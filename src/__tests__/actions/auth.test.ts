/**
 * Auth Server Actions Tests
 * Unit tests for authentication server actions
 */

import { mock, describe, it, expect, beforeEach, afterEach } from "bun:test";

// Isolated local mock state to prevent race conditions with other test files
const mockState = {
  user: null as { id: string; email: string } | null,
  session: null as { access_token: string; user: { id: string } } | null,
  profile: null as {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url?: string | null;
    email: string;
    is_active?: boolean;
    onboarding_completed?: boolean;
  } | null,
  userRoles: [] as Array<{ roles: { name: string } }>,
  listing: null as { id: number; post_name: string; profile_id: string } | null,
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

// Helper to create query chain for Supabase mocks
const createQueryChain = (tableName?: string) => {
  const isUserRoles = tableName === "user_roles";
  const getResult = () => Promise.resolve({
    data: isUserRoles ? mockState.userRoles : mockState.profile,
    error: mockState.dbError,
  });

  const chain: any = {
    eq: mock(() => chain),
    in: mock(() => chain),
    single: mock(getResult),
    maybeSingle: mock(getResult),
    // eslint-disable-next-line unicorn/no-thenable
    then: (onfulfilled?: any, onrejected?: any) => getResult().then(onfulfilled, onrejected),
    catch: (onrejected?: any) => getResult().catch(onrejected),
  };
  return chain;
};

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => {
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
      from: (tableName: string) => ({
        select: () => createQueryChain(tableName),
        insert: () =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          }),
      }),
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
      })),
    });
  }),
  createServerClient: mock(() => Promise.resolve({})),
}));

mock.module("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tableName: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: tableName === "user_roles" ? (mockState.userRoles ?? []) : mockState.profile,
            error: mockState.dbError,
          }),
        in: () =>
          Promise.resolve({
            data: tableName === "user_roles" ? (mockState.userRoles ?? []) : mockState.profile,
            error: mockState.dbError,
          }),
        single: () =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          }),
        maybeSingle: () =>
          Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          }),
      }),
    }),
  }),
}));

// Import actions after mocks
import {
  getSession,
  getUser,
  checkUserIsAdmin,
  signInWithPassword,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
  getOAuthSignInUrl,
} from "@/app/actions/auth";

describe("Auth Server Actions", () => {
  const resetState = () => {
    mockState.user = null;
    mockState.session = null;
    mockState.profile = null;
    mockState.userRoles = [];
    mockState.authError = null;
    mockState.dbError = null;
  };

  beforeEach(resetState);
  afterEach(resetState);

  // ==========================================================================
  // getSession Tests
  // ==========================================================================

  describe("getSession", () => {
    it("should return session when authenticated", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };
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
  // checkUserIsAdmin Tests
  // ==========================================================================

  describe("checkUserIsAdmin", () => {
    it("should return true for admin user", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await checkUserIsAdmin();

      expect(result).toBe(true);
    });

    it("should return true for superadmin user", async () => {
      mockState.user = { id: "super-123", email: "super@example.com" };
      mockState.userRoles = [{ roles: { name: "superadmin" } }];

      const result = await checkUserIsAdmin();

      expect(result).toBe(true);
    });

    it("should return false for regular user", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = []; // No admin role in user_roles junction table

      const result = await checkUserIsAdmin();

      expect(result).toBe(false);
    });

    it("should return false when not authenticated", async () => {
      mockState.user = null;
      mockState.userRoles = null;

      const result = await checkUserIsAdmin();

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
