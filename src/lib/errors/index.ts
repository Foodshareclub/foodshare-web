/**
 * Error Handling Module
 * Centralized error handling for the FoodShare application
 */

// Types
export type {
  ErrorCode,
  AppError,
  ActionResult,
  ActionResultWithData,
  ActionResultVoid,
  ApiError,
  ErrorContext,
  ServerActionError,
  ServerActionSuccess,
  ServerActionResult,
  SupabaseError,
} from "./types";

// Server Action Factories (primary system)
export {
  createError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  databaseError,
  internalError,
  conflictError,
  rateLimitError,
  timeoutError,
  success,
  successVoid,
  failure,
  withErrorHandling,
} from "./server-actions";

// Server Action Factories (secondary system)
export {
  serverActionError,
  serverActionSuccess,
  isServerActionError,
  isServerActionSuccess,
  getServerActionErrorMessage,
  withServerActionErrorHandling,
} from "./server-actions";

// Type Guards & Unknown Error Utilities
export {
  isAppError,
  isSuccessResult,
  isFailureResult,
  getUnknownErrorMessage,
  toError,
  hasErrorCode,
  isPrerenderInterruption,
} from "./guards";

// Zod Validation Helpers
export { validateWithSchema, formatZodErrors } from "./validation";

// API Errors
export { createApiError, isApiError, getUserMessage, isRetryable, generateRequestId } from "./api";

// Supabase Error Mapping
export { mapSupabaseError, isSupabaseError } from "./supabase";

// Storage Error Handling (Supabase Storage availability + recovery)
export {
  detectStorageError,
  testStorageAvailability,
  clearSupabaseStorage,
  logStorageError,
  type StorageErrorType,
  type StorageErrorInfo,
} from "./storage-handler";

// Auth Errors — codes, not sentences. See ./auth.ts for why the English-message
// versions of these were removed rather than deprecated.
export {
  AUTH_ERROR_CODES,
  authErrorKey,
  toAuthErrorCode,
  getAuthErrorCode,
  sanitizeErrorMessage,
  type AuthErrorCode,
} from "./auth";

// Error Handler
export {
  ApiErrorHandler,
  apiErrorHandler,
  getErrorMessage,
  getAppErrorSuggestion,
  isNetworkErrorFromAppError,
  isAuthErrorFromAppError,
  sanitizeAppErrorMessage,
} from "./handler";

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
