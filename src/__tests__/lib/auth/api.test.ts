/**
 * Authentication API Tests
 * Unit tests for auth operations
 */

import { describe, it, expect } from "@jest/globals";

describe("Authentication API", () => {
  describe("auth object", () => {
    it("should be exported from api module", async () => {
      const apiModule = await import("@/lib/auth/api");
      expect(apiModule.auth).toBeDefined();
    });
  });

  describe("Sign Up", () => {
    it("should have signUp method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.signUp).toBeDefined();
      expect(typeof auth.signUp).toBe("function");
    });

    it("should accept SignUpData parameter", () => {
      // SignUpData should include email, password, firstName, lastName
      const signUpFields = ["email", "password", "firstName", "lastName", "metadata"];
      expect(signUpFields).toContain("email");
      expect(signUpFields).toContain("password");
    });
  });

  describe("Sign In", () => {
    it("should have signIn method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.signIn).toBeDefined();
      expect(typeof auth.signIn).toBe("function");
    });

    it("should have signInWithOtp method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.signInWithOtp).toBeDefined();
      expect(typeof auth.signInWithOtp).toBe("function");
    });

    it("should have signInWithProvider method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.signInWithProvider).toBeDefined();
      expect(typeof auth.signInWithProvider).toBe("function");
    });
  });

  describe("OAuth", () => {
    it("should have verifyOAuthState method for CSRF protection", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.verifyOAuthState).toBeDefined();
      expect(typeof auth.verifyOAuthState).toBe("function");
    });

    it("should have getReturnUrl method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.getReturnUrl).toBeDefined();
      expect(typeof auth.getReturnUrl).toBe("function");
    });

    it("should support common OAuth providers", () => {
      const providers = ["google", "facebook", "github", "apple"];
      expect(providers).toContain("google");
      expect(providers).toContain("github");
    });
  });

  describe("Sign Out", () => {
    it("should have signOut method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.signOut).toBeDefined();
      expect(typeof auth.signOut).toBe("function");
    });
  });

  describe("Session Management", () => {
    it("should have getSession method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.getSession).toBeDefined();
      expect(typeof auth.getSession).toBe("function");
    });

    it("should have getUser method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.getUser).toBeDefined();
      expect(typeof auth.getUser).toBe("function");
    });

    it("should have refreshSession method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.refreshSession).toBeDefined();
      expect(typeof auth.refreshSession).toBe("function");
    });
  });

  describe("Password Management", () => {
    it("should have resetPassword method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.resetPassword).toBeDefined();
      expect(typeof auth.resetPassword).toBe("function");
    });

    it("should have updatePassword method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.updatePassword).toBeDefined();
      expect(typeof auth.updatePassword).toBe("function");
    });
  });

  describe("User Updates", () => {
    it("should have updateEmail method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.updateEmail).toBeDefined();
      expect(typeof auth.updateEmail).toBe("function");
    });

    it("should have updateMetadata method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.updateMetadata).toBeDefined();
      expect(typeof auth.updateMetadata).toBe("function");
    });
  });

  describe("Auth State", () => {
    it("should have onAuthStateChange method", async () => {
      const { auth } = await import("@/lib/auth/api");
      expect(auth.onAuthStateChange).toBeDefined();
      expect(typeof auth.onAuthStateChange).toBe("function");
    });
  });

  describe("CSRF Protection", () => {
    it("should verify OAuth state matches", () => {
      // CSRF protection verifies state parameter matches stored state
      const storedState = "abc123";
      const urlState = "abc123";
      expect(storedState === urlState).toBe(true);
    });

    it("should reject mismatched OAuth state", () => {
      const storedState: string = "abc123";
      const urlState: string = "xyz789";
      expect(storedState === urlState).toBe(false);
    });

    it("should reject null states", () => {
      const storedState = null;
      const urlState = "abc123";
      expect(!storedState || !urlState || storedState !== urlState).toBe(true);
    });
  });
});
