/**
 * Auth Error Handling
 * User-friendly error messages for authentication flows
 */

import type { AuthError } from "@supabase/supabase-js";

/**
 * Auth error message constants
 */
export const AUTH_ERRORS = {
  // Login errors
  INVALID_CREDENTIALS: "Incorrect email or password. Please try again.",
  EMAIL_NOT_CONFIRMED: "Please check your email and confirm your account before logging in.",
  USER_NOT_FOUND: "No account found with this email address.",

  // Registration errors
  EMAIL_ALREADY_EXISTS: "An account with this email already exists. Try logging in instead.",
  WEAK_PASSWORD: "Password must be at least 6 characters long.",
  INVALID_EMAIL: "Please enter a valid email address.",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "Too many attempts. Please try again in a few minutes.",

  // Session errors
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  SESSION_NOT_FOUND: "No active session found. Please log in.",
  SESSION_INVALID: "Your session is invalid. Please log in again.",

  // OAuth errors
  OAUTH_CANCELLED: "Sign-in was cancelled. Please try again.",
  OAUTH_FAILED: "Sign-in failed. Please try another method.",
  OAUTH_STATE_MISMATCH: "Security verification failed. Please try again.",
  OAUTH_REDIRECT_ERROR: "Authentication redirect error. Please contact support.",

  // Network errors
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  TIMEOUT: "Request timed out. Please try again.",

  // Generic
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
} as const;

/**
 * Error message mapping for Supabase auth errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Invalid credentials
  "Invalid login credentials": AUTH_ERRORS.INVALID_CREDENTIALS,
  "Email not confirmed": AUTH_ERRORS.EMAIL_NOT_CONFIRMED,
  "User already registered": AUTH_ERRORS.EMAIL_ALREADY_EXISTS,

  // Password errors
  "Password should be at least 6 characters": AUTH_ERRORS.WEAK_PASSWORD,
  "Password is too weak": AUTH_ERRORS.WEAK_PASSWORD,

  // Email errors
  "Unable to validate email address: invalid format": AUTH_ERRORS.INVALID_EMAIL,
  "Email address is invalid": AUTH_ERRORS.INVALID_EMAIL,

  // Rate limiting
  "Email rate limit exceeded": AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
  "SMS rate limit exceeded": AUTH_ERRORS.RATE_LIMIT_EXCEEDED,

  // Network errors
  "Failed to fetch": AUTH_ERRORS.NETWORK_ERROR,
  "Network request failed": AUTH_ERRORS.NETWORK_ERROR,

  // OAuth errors
  "Invalid redirect URL": AUTH_ERRORS.OAUTH_REDIRECT_ERROR,
  "redirect_to URL is not allowed": AUTH_ERRORS.OAUTH_REDIRECT_ERROR,

  // Session errors
  "No session found": AUTH_ERRORS.SESSION_NOT_FOUND,
  "Invalid session": AUTH_ERRORS.SESSION_INVALID,
  "Session expired": AUTH_ERRORS.SESSION_EXPIRED,
};

/**
 * Convert auth error to user-friendly message
 */
export function getAuthErrorMessage(error: AuthError | Error | unknown): string {
  if (!error) return AUTH_ERRORS.UNKNOWN_ERROR;

  const errorMessage =
    typeof error === "string"
      ? error
      : (error as AuthError).message || (error as Error).message || "Unknown error";

  // Check for OAuth-specific errors
  if (errorMessage.includes("pkce") || errorMessage.includes("code_verifier")) {
    return AUTH_ERRORS.OAUTH_FAILED;
  }

  if (errorMessage.includes("state") && errorMessage.includes("mismatch")) {
    return AUTH_ERRORS.OAUTH_STATE_MISMATCH;
  }

  // Check for exact matches
  if (ERROR_MESSAGES[errorMessage]) {
    return ERROR_MESSAGES[errorMessage];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return sanitized original error
  return sanitizeErrorMessage(errorMessage);
}

/**
 * Remove sensitive information from error messages
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

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("internet") ||
    message.includes("connection")
  );
}

/**
 * Check if error is auth-related (credentials, permissions)
 */
export function isAuthError(error: unknown): boolean {
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    message.includes("credentials") ||
    message.includes("password") ||
    message.includes("email") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  );
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  const errorMessage = (error as { message?: string })?.message?.toLowerCase() || "";
  const errorCode = (error as { code?: string })?.code?.toLowerCase() || "";

  // Non-recoverable errors
  const nonRecoverable = ["email_not_confirmed", "user_already_exists", "invalid_email"];

  return !nonRecoverable.some((code) => errorCode.includes(code) || errorMessage.includes(code));
}

/**
 * Get helpful suggestion for error
 */
export function getErrorSuggestion(error: unknown): string | null {
  const message = getAuthErrorMessage(error).toLowerCase();

  if (message.includes("credentials")) {
    return "Double-check your email and password, or try resetting your password.";
  }

  if (message.includes("email not confirmed") || message.includes("confirm")) {
    return "Check your email inbox for a confirmation link, or request a new one.";
  }

  if (message.includes("redirect")) {
    if (process.env.NODE_ENV !== "production") {
      return "Add http://localhost:3000/auth/callback to Supabase allowed redirect URLs.";
    }
    return "Please contact support for assistance.";
  }

  if (message.includes("network") || message.includes("connection")) {
    return "Check your internet connection and try again.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Please wait a few minutes before trying again.";
  }

  return null;
}
