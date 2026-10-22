/* oxlint-disable unicorn/no-thenable -- Supabase query builder mocks must be thenable. */
/**
 * Auth Server Actions Tests
 * Unit tests for authentication server actions
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Session } from "@supabase/supabase-js";

import type { AuthUserProfile } from "@/types/auth.types";

// Isolated local mock state to prevent race conditions with other test files
const mockState = {
  user: null as { id: string; email: string } | null,
  session: null as Session | null,
  profile: null as AuthUserProfile | null,
  userRoles: [] as Array<{ roles: { name: string } }> | null,
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
type ChainQueryResult = {
  data: typeof mockState.userRoles | typeof mockState.profile;
  error: typeof mockState.dbError;
};

interface MockQueryChain {
  eq: () => MockQueryChain;
  in: () => MockQueryChain;
  single: () => Promise<ChainQueryResult>;
  maybeSingle: () => Promise<ChainQueryResult>;
  then: (
    onfulfilled?: ((value: ChainQueryResult) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
  catch: (onrejected?: ((reason: unknown) => unknown) | null) => Promise<unknown>;
}

const createQueryChain = (tableName?: string): MockQueryChain => {
  const isUserRoles = tableName === "user_roles";
  const getResult = () =>
    Promise.resolve({
      data: isUserRoles ? mockState.userRoles : mockState.profile,
      error: mockState.dbError,
    });

  const chain: MockQueryChain = {
    eq: mock(() => chain),
    in: mock(() => chain),
    single: mock(getResult),
    maybeSingle: mock(getResult),
    then: (onfulfilled, onrejected) => getResult().then(onfulfilled, onrejected),
    catch: (onrejected) => getResult().catch(onrejected),
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
          }),
        ),
        getUser: mock(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          }),
        ),
        signInWithPassword: mock(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          }),
        ),
        signUp: mock(() =>
          Promise.resolve({
            data: { user: mockState.user, session: mockState.session },
            error: mockState.authError,
          }),
        ),
        signOut: mock(() => Promise.resolve({ error: mockState.authError })),
        resetPasswordForEmail: mock(() =>
          Promise.resolve({
            data: {},
            error: mockState.authError,
          }),
        ),
        updateUser: mock(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          }),
        ),
        signInWithOAuth: mock(() =>
          Promise.resolve({
            data: { url: "https://oauth.example.com/authorize" },
            error: mockState.authError,
          }),
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
      from: mock(() => ({})),
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
  checkUserIsAdmin,
  getOAuthSignInUrl,
  getSession,
  getUser,
  resetPassword,
  signInWithPassword,
  signOut,
  signUp,
  updatePassword,
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
      // The mock returns the two fields the action reads; the session the
      // action returns is the whole thing, and the test compares the two.
      mockState.session = {
        access_token: "test-token",
        user: { id: "user-123" },
      } as Session;

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
        search_radius_km: null,
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
          search_radius_km: null,
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
      mockState.session = { access_token: "token", user: { id: "user-123" } } as Session;

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      const result = await signInWithPassword(formData);

      expect(result).toEqual({ success: true });
    });

    it("returns a code, not Supabase's sentence", async () => {
      // The contract changed deliberately. `error` was `error.message` — English,
      // from a third party, on the response body — and it was rendered verbatim in
      // all 21 locales. It is now a catalogue-resolvable code, so the assertion
      // names the *code*: if this ever returns the raw sentence again, it fails
      // on the difference rather than passing on `toBeDefined()`.
      mockState.authError = { message: "Invalid login credentials" };

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrong");

      const result = await signInWithPassword(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("invalidCredentials");
    });

    it("does not put the Supabase message anywhere in the result", async () => {
      mockState.authError = { message: "Invalid login credentials" };
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrong");

      const result = await signInWithPassword(formData);
      expect(JSON.stringify(result)).not.toContain("Invalid login credentials");
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

      expect(result.success).toBe(true);
    });

    it("should return error when email already exists", async () => {
      mockState.authError = { message: "User already registered" };

      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");
      formData.append("name", "Existing User");

      const result = await signUp(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("emailExists");
    });
  });

  // ==========================================================================
  // signOut Tests
  // ==========================================================================

  describe("signOut", () => {
    it("should sign out and redirect to home", async () => {
      try {
        await signOut();
        expect.unreachable("Expected signOut to throw NEXT_REDIRECT");
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

      expect(result.success).toBe(true);
    });

    it("maps an unmapped Supabase message to `unknown` rather than passing it on", async () => {
      // "User not found" is not in the mapping table. It used to be handed to the
      // client verbatim; the only safe answer for an unrecognised message is a
      // code that resolves to generic copy, because an unrecognised message is by
      // definition a message nobody has reviewed for display.
      mockState.authError = { message: "User not found" };

      const result = await resetPassword("nonexistent@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("unknown");
      expect(JSON.stringify(result)).not.toContain("User not found");
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

      expect(result.success).toBe(true);
    });

    it("should return error on invalid password", async () => {
      const formData = new FormData();
      formData.append("password", "123");

      const result = await updatePassword(formData);

      // A zod message is a code for the same reason a Supabase message is.
      expect(result.success).toBe(false);
      expect(result.error).toBe("weakPassword");
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

    it("returns a code, and no provider name in English", async () => {
      // This built `"GitHub sign-in is not configured yet. Please use
      // email/password or magic link."` on the server and sent it to the browser.
      // The provider's name is now interpolated by the caller, from its own
      // translated label, so the sentence around it can be translated.
      mockState.authError = { message: "OAuth provider not configured" };

      const result = await getOAuthSignInUrl("github");

      expect(result.url).toBeNull();
      expect(result.code).toBe("unknown");
      expect(JSON.stringify(result)).not.toContain("sign-in");
    });

    it("maps a missing OAuth secret to `providerNotConfigured`", async () => {
      mockState.authError = { message: "missing OAuth secret" };

      const result = await getOAuthSignInUrl("github");

      expect(result.code).toBe("providerNotConfigured");
    });
  });
});
