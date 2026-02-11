/**
 * Error Types
 * Unified error type definitions for the FoodShare application
 */

/**
 * Error codes for categorizing errors (merged superset)
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
  | "RATE_LIMIT"
  | "DATABASE_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "PAYLOAD_TOO_LARGE"
  | "CIRCUIT_OPEN"
  | "INTERNAL_ERROR"
  | "CONFLICT";

// ============================================================================
// Primary Error Types (used by ~28 files via @/lib/errors)
// ============================================================================

/**
 * Application-level error with optional details
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Action result type — primary pattern for server actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export type ActionResultWithData<T> = ActionResult<T>;
export type ActionResultVoid = ActionResult<undefined>;

// ============================================================================
// Secondary Error Types (used by errors/ subsystem)
// ============================================================================

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
    details?: unknown;
  };
}

/**
 * Server action success response
 */
export interface ServerActionSuccess<T = void> {
  success: true;
  data: T;
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
