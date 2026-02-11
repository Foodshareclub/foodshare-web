/**
 * API Error Utilities
 * Creation and validation of API errors
 */

import type { ApiError, ErrorCode } from "./types";

/**
 * User-friendly messages for each error code
 */
const USER_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: "Connection issue. Please check your internet and try again.",
  AUTH_ERROR: "Please sign in to continue.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  VALIDATION_ERROR: "Please check your input and try again.",
  NOT_FOUND: "The requested item was not found.",
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  DATABASE_ERROR: "A database error occurred. Please try again.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  TIMEOUT: "The request timed out. Please try again.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again later.",
  PAYLOAD_TOO_LARGE: "The request is too large. Please reduce the size and try again.",
  CIRCUIT_OPEN: "This service is temporarily unavailable. Please try again shortly.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  CONFLICT: "A conflict occurred. The resource may have been modified.",
};

/**
 * Error codes that can be retried
 */
const RETRYABLE_ERRORS: Set<ErrorCode> = new Set([
  "NETWORK_ERROR",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "DATABASE_ERROR",
]);

/**
 * Create a standardized API error
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    userMessage: USER_MESSAGES[code],
    retryable: RETRYABLE_ERRORS.has(code),
    details,
    timestamp: new Date(),
  };
}

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "userMessage" in error
  );
}

/**
 * Get user-friendly message for error code
 */
export function getUserMessage(code: ErrorCode): string {
  return USER_MESSAGES[code];
}

/**
 * Check if error code is retryable
 */
export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE_ERRORS.has(code);
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
