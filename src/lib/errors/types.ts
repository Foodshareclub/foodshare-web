/**
 * Error Types
 * Unified error type definitions for the FoodShare application
 */

/**
 * Error codes for categorizing API errors
 */
export type ErrorCode =
  | "NETWORK_ERROR"
  | "AUTH_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "DATABASE_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Structured API error with code and metadata
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
}

/**
 * Context for error logging and debugging
 */
export interface ErrorContext {
  operation: string;
  table?: string;
  userId?: string;
  timestamp: Date;
  requestId: string;
}

/**
 * Server action error response
 */
export interface ServerActionError {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
  };
}

/**
 * Server action success response
 */
export interface ServerActionSuccess<T = void> {
  success: true;
  data?: T;
}

/**
 * Server action result (union type)
 */
export type ServerActionResult<T = void> = ServerActionSuccess<T> | ServerActionError;

/**
 * Supabase error shape
 */
export interface SupabaseError {
  code?: string;
  message?: string;
  hint?: string;
  details?: string;
}
