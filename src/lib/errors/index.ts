/**
 * Error Handling Module
 * Centralized error handling for the FoodShare application
 */

// Types
export type {
  ErrorCode,
  ApiError,
  ErrorContext,
  ServerActionError,
  ServerActionSuccess,
  ServerActionResult,
  SupabaseError,
} from "./types";

// API Errors
export { createApiError, isApiError, getUserMessage, isRetryable, generateRequestId } from "./api";

// Server Action Errors
export {
  serverActionError,
  serverActionSuccess,
  isServerActionError,
  isServerActionSuccess,
  getErrorMessage,
  withErrorHandling,
} from "./server-actions";

// Supabase Error Mapping
export { mapSupabaseError, isSupabaseError } from "./supabase";

// Auth Errors
export {
  AUTH_ERRORS,
  getAuthErrorMessage,
  sanitizeErrorMessage,
  isNetworkError,
  isAuthError,
  isRecoverableError,
  getErrorSuggestion,
} from "./auth";

// Error Handler
export { ApiErrorHandler, apiErrorHandler } from "./handler";

// Recovery Strategies
export {
  executeRecovery,
  createStandardRecovery,
  createAggressiveRecovery,
  createInteractiveRecovery,
  createCriticalRecovery,
  withRecovery,
  createRecoverableFetch,
  useRecovery,
} from "./recovery";
export type {
  RecoveryStrategyType,
  RetryStrategy,
  CacheStrategy,
  DegradeStrategy,
  PromptStrategy,
  RecoveryStrategy,
  RecoveryConfig,
  RecoveryResult,
} from "./recovery";
