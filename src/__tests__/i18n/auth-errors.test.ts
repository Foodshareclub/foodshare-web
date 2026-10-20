/**
 * Tests for the auth error channel.
 *
 * The defect these exist for: every auth failure a reader saw was an English
 * string, and no amount of translating the page fixed it. `useAuth` fell back to
 * `"Login failed"`, the server action passed `error.message` — Supabase's own
 * English — straight through, and `getOAuthSignInUrl` built
 * `"Google sign-in is not correctly configured…"` from a template in the
 * browser. All three were reachable precisely when something had already gone
 * wrong.
 *
 * A code instead of a sentence closes the class: the catalogue resolves the
 * wording, so no Supabase release can change what a reader sees. These tests
 * assert the code, not the prose, because the prose is somebody else's copy.
 */
import { describe, expect, it } from "bun:test";

import {
  AUTH_ERROR_CODES,
  authErrorKey,
  getAuthErrorCode,
  sanitizeErrorMessage,
  toAuthErrorCode,
} from "@/lib/errors/auth";
import { LOCALES } from "../../../scripts/lib/catalogue-batch";

/** The exact strings Supabase returns, as of the pinned version. */
const SUPABASE = {
  invalidCredentials: "Invalid login credentials",
  emailNotConfirmed: "Email not confirmed",
  emailExists: "User already registered",
  weakPassword: "Password should be at least 6 characters",
  invalidEmail: "Unable to validate email address: invalid format",
  rateLimited: "Email rate limit exceeded",
  providerNotConfigured: "missing OAuth secret",
  oauthFailed: "Token has invalid PKCE code_verifier",
  networkError: "Failed to fetch",
} as const;

describe("auth error codes — what Supabase says becomes what we show", () => {
  it("maps each Supabase message to its own code", () => {
    expect(getAuthErrorCode(SUPABASE.invalidCredentials)).toBe("invalidCredentials");
    expect(getAuthErrorCode(SUPABASE.emailNotConfirmed)).toBe("emailNotConfirmed");
    expect(getAuthErrorCode(SUPABASE.emailExists)).toBe("emailExists");
    expect(getAuthErrorCode(SUPABASE.weakPassword)).toBe("weakPassword");
    expect(getAuthErrorCode(SUPABASE.invalidEmail)).toBe("invalidEmail");
    expect(getAuthErrorCode(SUPABASE.rateLimited)).toBe("rateLimited");
    expect(getAuthErrorCode(SUPABASE.providerNotConfigured)).toBe("providerNotConfigured");
    expect(getAuthErrorCode(SUPABASE.oauthFailed)).toBe("oauthFailed");
    expect(getAuthErrorCode(SUPABASE.networkError)).toBe("networkError");
  });

  it("is case- and punctuation-insensitive, because Supabase varies both", () => {
    expect(getAuthErrorCode("invalid login credentials.")).toBe("invalidCredentials");
    expect(getAuthErrorCode("INVALID LOGIN CREDENTIALS")).toBe("invalidCredentials");
  });

  it("accepts an AuthError object, not only a string", () => {
    expect(getAuthErrorCode({ message: SUPABASE.invalidCredentials, status: 400 })).toBe("invalidCredentials");
  });

  it("falls back to `unknown` rather than passing a sentence through", () => {
    // The important case. An unmapped message must become a *code*; if it came
    // back as text it would be rendered, which is the original defect.
    expect(getAuthErrorCode("some Supabase release we have never seen")).toBe("unknown");
    expect(getAuthErrorCode("")).toBe("unknown");
    expect(getAuthErrorCode(undefined)).toBe("unknown");
    expect(getAuthErrorCode(null)).toBe("unknown");
  });

  it("prefers the generic OAuth answer when both signals are present", () => {
    // "pkce" appears inside messages that also name a more specific cause, and
    // "sign-in did not complete" is the safer of the two to show a reader.
    expect(getAuthErrorCode("redirect_to URL is not allowed (pkce)")).toBe("oauthFailed");
    expect(getAuthErrorCode("OAuth state mismatch")).toBe("oauthFailed");
  });

  it("coerces anything reaching the client to a known code", () => {
    expect(toAuthErrorCode("invalidCredentials")).toBe("invalidCredentials");
    expect(toAuthErrorCode("Invalid login credentials")).toBe("unknown");
    expect(toAuthErrorCode(42)).toBe("unknown");
  });
});

describe("auth error codes — the catalogue contract", () => {
  it("names every code, and only codes that exist", () => {
    for (const code of AUTH_ERROR_CODES) expect(authErrorKey(code)).toBe(`AuthFlow.errors.${code}`);
    // A code with no key renders as its own key path on screen.
    expect(AUTH_ERROR_CODES.every((code) => authErrorKey(code).startsWith("AuthFlow.errors."))).toBe(true);
  });

  it("has a translation for every code in every locale", async () => {
    const messages = Object.fromEntries(
      await Promise.all(
        LOCALES.map(async (locale) => [
          locale,
          JSON.parse(await Bun.file(new URL(`../../../messages/${locale}.json`, import.meta.url)).text()) as {
            AuthFlow?: { errors?: Record<string, string> };
          },
        ]),
      ),
    ) as Record<string, { AuthFlow?: { errors?: Record<string, string> } }>;

    for (const locale of LOCALES) {
      const errors = messages[locale]?.AuthFlow?.errors;
      expect(errors, `${locale} has no AuthFlow.errors`).toBeDefined();
      for (const code of AUTH_ERROR_CODES)
        expect(typeof errors?.[code], `${locale} is missing AuthFlow.errors.${code}`).toBe("string");
    }
  });

  it("holds a distinct sentence per code, so two errors cannot read alike", async () => {
    const en = JSON.parse(await Bun.file(new URL("../../../messages/en.json", import.meta.url)).text()) as {
      AuthFlow: { errors: Record<string, string> };
    };

    const seen = new Map<string, string>();
    for (const code of AUTH_ERROR_CODES) {
      const value = en.AuthFlow.errors[code];
      expect(value, `en is missing ${code}`).toBeTruthy();
      expect(value, `${code} is its own key path`).not.toBe(`AuthFlow.errors.${code}`);
      const clash = seen.get(value);
      // Two codes sharing a sentence is how an error message stops telling a
      // reader what went wrong; `unknown` falling back is the only acceptable one.
      if (clash && code !== "unknown" && clash !== "unknown")
        throw new Error(`${code} and ${clash} have the same English text`);
      seen.set(value, code);
    }
  });
});

describe("auth error codes — what still gets logged", () => {
  it("redacts a token, an id and an email address from a free-text message", () => {
    const raw =
      "Failed for user 550e8400-e29b-41d4-a716-446655440000 at ada@example.com with eyJhbGciOiJIUzI1NiJ9abcdefghijklmnop";
    const clean = sanitizeErrorMessage(raw);
    expect(clean).not.toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(clean).not.toContain("ada@example.com");
    expect(clean).not.toContain("eyJhbGciOiJIUzI1NiJ9abcdefghijklmnop");
  });

  it("does not treat redaction as classification", () => {
    // It removes; it does not decide. A caller that wants a message to *show*
    // resolves the code instead, which is what keeps internals off the screen.
    expect(getAuthErrorCode(sanitizeErrorMessage("Invalid login credentials"))).toBe("invalidCredentials");
  });
});
