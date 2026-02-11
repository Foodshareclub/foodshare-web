/**
 * Type Guards and Unknown Error Utilities
 */

import type { AppError, ActionResult } from "./types";

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
