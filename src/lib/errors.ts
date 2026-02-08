/**
 * Standardized Error Handling for Server Actions
 * Provides consistent error types, messages, and logging
 */

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "INTERNAL_ERROR"
  | "CONFLICT"
  | "UNKNOWN_ERROR"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "PAYLOAD_TOO_LARGE"
  | "CIRCUIT_OPEN";

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// ============================================================================
// Action Result Types
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export type ActionResultWithData<T> = ActionResult<T>;
export type ActionResultVoid = ActionResult<undefined>;

// ============================================================================
// Error Factory Functions
// ============================================================================

export function createError(code: ErrorCode, message: string, details?: unknown): AppError {
  return { code, message, details };
}

export function unauthorizedError(message = "Authentication required"): AppError {
  return createError("UNAUTHORIZED", message);
}

export function forbiddenError(
  message = "You do not have permission to perform this action"
): AppError {
  return createError("FORBIDDEN", message);
}

export function notFoundError(resource = "Resource"): AppError {
  return createError("NOT_FOUND", `${resource} not found`);
}

export function validationError(message: string, details?: unknown): AppError {
  return createError("VALIDATION_ERROR", message, details);
}

export function databaseError(message: string, details?: unknown): AppError {
  return createError("DATABASE_ERROR", message, details);
}

export function internalError(message = "An unexpected error occurred"): AppError {
  return createError("INTERNAL_ERROR", message);
}

export function conflictError(message: string): AppError {
  return createError("CONFLICT", message);
}

export function rateLimitError(
  message = "Too many requests. Please wait a moment and try again."
): AppError {
  return createError("RATE_LIMIT", message);
}

export function timeoutError(message = "The request timed out. Please try again."): AppError {
  return createError("TIMEOUT", message);
}

// ============================================================================
// Result Factory Functions
// ============================================================================

export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function successVoid(): ActionResult<undefined> {
  return { success: true, data: undefined };
}

export function failure(error: AppError): ActionResult<never> {
  return { success: false, error };
}

// ============================================================================
// Error Handling Wrapper
// ============================================================================

/**
 * Wraps an async function with standardized error handling
 * Catches errors and converts them to ActionResult
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorContext?: string
): Promise<ActionResult<T>> {
  const ctx = errorContext ? `[${errorContext}]` : "[withErrorHandling]";
  console.log(`${ctx} 🔄 Starting...`);

  try {
    const data = await fn();
    console.log(`${ctx} ✅ Success`);
    return success(data);
  } catch (error) {
    // Always log errors for debugging
    console.error(`${ctx} ❌ Error caught:`, error);

    // Handle known error types
    if (error instanceof Error) {
      // Supabase specific errors
      if ("code" in error) {
        const pgError = error as Error & { code: string };
        console.error(`${ctx} 📋 Postgres error code:`, pgError.code);

        switch (pgError.code) {
          case "PGRST116": // Not found
            return failure(notFoundError());
          case "23505": // Unique violation
            return failure(conflictError("This item already exists"));
          case "23503": // Foreign key violation
            return failure(validationError("Referenced item does not exist"));
          case "42501": // Insufficient privilege
            return failure(forbiddenError());
          default:
            return failure(databaseError(error.message));
        }
      }

      // Auth errors
      if (error.message.includes("not authenticated") || error.message.includes("JWT")) {
        console.error(`${ctx} 🔐 Auth error detected`);
        return failure(unauthorizedError());
      }

      return failure(internalError(error.message));
    }

    return failure(internalError());
  }
}

// ============================================================================
// Zod Validation Helper
// ============================================================================

import { type ZodError, type ZodSchema } from "zod";

/**
 * Validate data against a Zod schema
 * Returns ActionResult with validation errors if invalid
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): ActionResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return failure(validationError("Validation failed", errors));
  }

  return success(result.data);
}

/**
 * Format Zod errors into readable messages
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "value";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

/**
 * Convert error code to user-friendly message
 */
// Backwards compatibility aliases
export type ServerActionResult<T = void> = ActionResult<T>;

/**
 * Create a server action error result (backwards compatible)
 * @param message - Error message
 * @param code - Optional error code (defaults to INTERNAL_ERROR)
 */
export function serverActionError(message: string, code?: ErrorCode): ActionResult<never> {
  return failure(createError(code ?? "INTERNAL_ERROR", message));
}

export const getAuthErrorMessage = getErrorMessage;
export const sanitizeErrorMessage = (msg: string) => msg.replace(/[<>&'"]/g, "");
export const isNetworkError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("network");
export const isAuthError = (error: unknown) =>
  isAppError(error) && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN");
export const getErrorSuggestion = (error: AppError) => {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "Try signing in again";
    case "NETWORK_ERROR":
      return "Check your internet connection";
    case "TIMEOUT":
      return "The server took too long to respond. Try again.";
    case "SERVICE_UNAVAILABLE":
      return "The service is temporarily down. Try again in a few minutes.";
    case "PAYLOAD_TOO_LARGE":
      return "The data you sent is too large. Try reducing the file size.";
    case "CIRCUIT_OPEN":
      return "This service is temporarily unavailable. Try again shortly.";
    case "RATE_LIMIT":
      return "You're making requests too quickly. Wait a moment and try again.";
    default:
      return "Please try again later";
  }
};

export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "Please sign in to continue";
    case "FORBIDDEN":
      return "You don't have permission to do this";
    case "NOT_FOUND":
      return "The item you're looking for doesn't exist";
    case "VALIDATION_ERROR":
      return error.message;
    case "DATABASE_ERROR":
      return "A database error occurred. Please try again.";
    case "NETWORK_ERROR":
      return "Unable to connect. Please check your internet connection.";
    case "RATE_LIMIT":
      return "Too many requests. Please wait a moment and try again.";
    case "CONFLICT":
      return error.message;
    case "TIMEOUT":
      return "The request timed out. Please try again.";
    case "SERVICE_UNAVAILABLE":
      return "The service is temporarily unavailable. Please try again later.";
    case "PAYLOAD_TOO_LARGE":
      return "The request is too large. Please reduce the size and try again.";
    case "CIRCUIT_OPEN":
      return "This service is temporarily unavailable. Please try again shortly.";
    case "INTERNAL_ERROR":
    default:
      return "Something went wrong. Please try again later.";
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

export function isSuccessResult<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFailureResult<T>(
  result: ActionResult<T>
): result is { success: false; error: AppError } {
  return result.success === false;
}

// ============================================================================
// Unknown Error Handling
// ============================================================================

/**
 * Safely extract error message from unknown error type
 * Use this in catch blocks instead of `catch (error: any)`
 */
export function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unknown error occurred";
}

/**
 * Convert unknown error to Error instance
 * Use this when you need a proper Error object
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(getUnknownErrorMessage(error));
}

/**
 * Type guard to check if an error has a specific code property
 */
export function hasErrorCode<T extends string>(
  error: unknown,
  code: T
): error is Error & { code: T } {
  return (
    error instanceof Error && "code" in error && (error as Error & { code: unknown }).code === code
  );
}
