/**
 * Server Action Error Utilities
 * Standardized error handling for Next.js Server Actions
 */

import type { ErrorCode, ServerActionError, ServerActionSuccess, ServerActionResult } from "./types";

/**
 * Creates a standardized error response for server actions
 *
 * @example
 * ```typescript
 * if (!user) {
 *   return serverActionError('You must be logged in', 'UNAUTHORIZED');
 * }
 * ```
 */
export function serverActionError(message: string, code: ErrorCode): ServerActionError {
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
 *
 * @example
 * ```typescript
 * return serverActionSuccess({ id: newRecord.id });
 * ```
 */
export function serverActionSuccess<T>(data?: T): ServerActionSuccess<T> {
  if (data !== undefined) {
    return { success: true, data };
  }
  return { success: true } as ServerActionSuccess<T>;
}

/**
 * Type guard to check if a result is an error
 */
export function isServerActionError<T>(
  result: ServerActionResult<T>
): result is ServerActionError {
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
export function getErrorMessage<T>(result: ServerActionResult<T>): string | undefined {
  if (isServerActionError(result)) {
    return result.error.message;
  }
  return undefined;
}

/**
 * Wraps an async operation with standardized error handling
 *
 * @example
 * ```typescript
 * export async function getUser(id: string) {
 *   return withErrorHandling(async () => {
 *     const user = await db.users.findUnique({ where: { id } });
 *     if (!user) throw new Error('User not found');
 *     return user;
 *   });
 * }
 * ```
 */
export async function withErrorHandling<T>(
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
