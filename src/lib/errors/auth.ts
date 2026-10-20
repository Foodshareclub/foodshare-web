/**
 * Auth errors: stable codes, not sentences.
 *
 * This module used to be a table of English sentences — `AUTH_ERRORS`, with
 * `getAuthErrorMessage()` matching Supabase's error strings against them and
 * `getErrorSuggestion()`, `isNetworkError()`, `isAuthError()` and
 * `isRecoverableError()` doing further matching on the *result*. Every one of
 * those was a heuristic over English prose, and every one of them exported a
 * string that a UI could put on screen.
 *
 * **None of them was ever called.** `getAuthErrorMessage` was re-exported from
 * `@/lib/auth` and `@/lib/errors` and imported by nothing; `src/app/actions/auth.ts`
 * passed `error.message` — Supabase's own English — straight to the client, and
 * `useAuth` fell back to its own English `"Login failed"`. So the auth flow's
 * *error path*, the strings a reader sees most often when something goes wrong,
 * were English in all 21 locales, and the module written to prevent exactly that
 * sat unused next to them.
 *
 * A code instead of a sentence fixes the class rather than the instance: the
 * client resolves `AuthFlow.errors.invalidCredentials` through `t()`, so the
 * message is translated, and a Supabase upgrade that rewords its errors changes
 * a mapping table rather than the text every reader sees.
 */
import type { AuthError } from "@supabase/supabase-js";

/**
 * Every auth failure the UI can be told about.
 *
 * Deliberately coarse. The purpose is to pick a translation, and a code per
 * Supabase error string would be a translation per Supabase error string — which
 * means every Supabase upgrade becomes a copy change. Two Supabase messages
 * mapping to one code is the right amount of resolution.
 */
export const AUTH_ERROR_CODES = [
  "invalidCredentials",
  "emailNotConfirmed",
  "emailExists",
  "weakPassword",
  "invalidEmail",
  "rateLimited",
  "providerNotConfigured",
  "oauthFailed",
  "networkError",
  "fieldRequired",
  "fieldTooLong",
  "signInFailed",
  "signUpFailed",
  "passwordUpdateFailed",
  "passwordRecoveryFailed",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const isCode = (value: string): value is AuthErrorCode => (AUTH_ERROR_CODES as readonly string[]).includes(value);

/**
 * The catalogue key for a code, so callers write one thing rather than two.
 *
 * `AuthFlow.errors.<code>` — the namespace is not optional. A bare code would
 * work until the second namespace needed one, and next-intl's missing-key
 * fallback renders the key path literally, so a code that lost its prefix would
 * put `invalidCredentials` on screen in the shape next-intl renders rather than
 * in a sentence anyone can read.
 */
export const authErrorKey = (code: AuthErrorCode): string => `AuthFlow.errors.${code}`;

/** Coerce anything reaching the client into a code, never a raw message. */
export const toAuthErrorCode = (value: unknown): AuthErrorCode =>
  typeof value === "string" && isCode(value) ? value : "unknown";

/**
 * Supabase's error strings, mapped to codes.
 *
 * Exact matches first, then substring, because Supabase varies both — some paths
 * return "Invalid login credentials" and some "Invalid login credentials." —
 * and a user-visible code that only resolves for the exact spelling is worse
 * than the generic "sign-in failed" it was meant to replace.
 *
 * Lower-cased keys, and the incoming message is lower-cased to match. Matching
 * case-sensitively is how a mapping table ends up with a `// unreachable`
 * branch that a machine translation nobody reads assumes is impossible.
 */
const SUPABASE_MESSAGES: Record<string, AuthErrorCode> = {
  "invalid login credentials": "invalidCredentials",
  "email not confirmed": "emailNotConfirmed",
  "user already registered": "emailExists",
  "user already exists": "emailExists",
  "password should be at least": "weakPassword",
  "password is too weak": "weakPassword",
  "unable to validate email address": "invalidEmail",
  "email address": "invalidEmail",
  "email rate limit exceeded": "rateLimited",
  "sms rate limit exceeded": "rateLimited",
  "too many requests": "rateLimited",
  "failed to fetch": "networkError",
  "network request failed": "networkError",
  network: "networkError",
  pkce: "oauthFailed",
  code_verifier: "oauthFailed",
  "invalid redirect url": "providerNotConfigured",
  "redirect_to url is not allowed": "providerNotConfigured",
  "missing oauth secret": "providerNotConfigured",
  "unsupported provider": "providerNotConfigured",
  invalid_client: "providerNotConfigured",
};

/**
 * Map an auth error to a code.
 *
 * `oauthFailed` is checked before the table because its signals ("pkce",
 * "code_verifier") are substrings of messages that also carry a more specific
 * cause, and the generic OAuth answer is the safer of the two when both match.
 */
export function getAuthErrorCode(error: AuthError | Error | unknown): AuthErrorCode {
  const message = typeof error === "string" ? error : ((error as Error)?.message ?? "");
  const needle = message.toLowerCase();
  if (!needle) return "unknown";

  if (needle.includes("pkce") || needle.includes("code_verifier")) return "oauthFailed";
  if (needle.includes("state") && needle.includes("mismatch")) return "oauthFailed";

  const exact = SUPABASE_MESSAGES[needle];
  if (exact) return exact;

  for (const [fragment, code] of Object.entries(SUPABASE_MESSAGES)) if (needle.includes(fragment)) return code;

  return "unknown";
}

/**
 * Strip anything that should not reach a log or a client from a free-text error.
 *
 * Kept from the previous version of this module, and the only part of it that was
 * ever a utility rather than a heuristic. Still not a substitute for the code
 * table — it redacts, it does not classify — so callers that want a message to
 * *show* should resolve `authErrorKey(getAuthErrorCode(error))` instead.
 */
export function sanitizeErrorMessage(message: string): string {
  return (
    message
      // Remove tokens
      .replace(/[a-zA-Z0-9+/=]{20,}/g, "[redacted]")
      // Remove UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]")
      // Remove email addresses
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email]")
  );
}
