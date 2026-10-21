/**
 * Upload Module
 *
 * Robust file upload utilities with retry logic, circuit breaker,
 * and automatic fallback handling.
 */

export {
  // Types
  type UploadErrorType,
  type UploadError,
  type RetryConfig,
  type CircuitState,
  // Constants
  DEFAULT_RETRY_CONFIG,
  // Error handling
  classifyError,
  isCorsError,
  formatUploadError,
  // Circuit breaker
  isR2CircuitOpen,
  recordR2Failure,
  recordR2Success,
  resetR2Circuit,
  getR2CircuitState,
  // Retry logic
  calculateBackoffDelay,
  sleep,
  withRetry,
  // Fetch utilities
  fetchWithTimeout,
  robustUpload,
} from "./robust-upload";
