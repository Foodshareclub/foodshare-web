/**
 * Server Action Error Utilities
 * Standardized error handling for Next.js Server Actions
 */

import type {
  ErrorCode,
  AppError,
  ActionResult,
  ServerActionError as ServerActionErrorType,
  ServerActionSuccess,
  ServerActionResult,
} from "./types";

// ============================================================================
// AppError Factory Functions
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
// ActionResult Factory Functions
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
// ServerActionResult Factory Functions (secondary system)
// ============================================================================

/**
 * Creates a standardized error response for server actions
 */
export function serverActionError(message: string, code: ErrorCode): ServerActionErrorType {
  return {
    success: false,
    error: {
      message,
      code,
    },
  };
}

/**
 * Creates a standardized success response for server actions
 */
export function serverActionSuccess<T>(data: T): ServerActionSuccess<T> {
  return { success: true, data };
}

// ============================================================================
// Type Guards (ServerActionResult)
// ============================================================================

/**
 * Type guard to check if a result is an error
 */
export function isServerActionError<T>(
  result: ServerActionResult<T>
): result is ServerActionErrorType {
  return !result.success;
}

/**
 * Type guard to check if a result is a success
 */
export function isServerActionSuccess<T>(
  result: ServerActionResult<T>
): result is ServerActionSuccess<T> {
  return result.success;
}

/**
 * Extract error message from a server action result
 * Returns undefined if the result was successful
 */
export function getServerActionErrorMessage<T>(
  result: ServerActionResult<T>
): string | undefined {
  if (isServerActionError(result)) {
    return result.error.message;
  }
  return undefined;
}

// ============================================================================
// Error Handling Wrappers
// ============================================================================

/**
 * Wraps an async function with standardized error handling
 * Returns ActionResult (primary system)
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

/**
 * Wraps an async operation with standardized error handling
 * Returns ServerActionResult (secondary system)
 */
export async function withServerActionErrorHandling<T>(
  operation: () => Promise<T>,
  defaultErrorMessage = "An unexpected error occurred"
): Promise<ServerActionResult<T>> {
  try {
    const data = await operation();
    return serverActionSuccess(data);
  } catch (error) {
    console.error("Server action error:", error);

    if (error instanceof Error) {
      return serverActionError(error.message, "UNKNOWN_ERROR");
    }

    return serverActionError(defaultErrorMessage, "UNKNOWN_ERROR");
  }
}
