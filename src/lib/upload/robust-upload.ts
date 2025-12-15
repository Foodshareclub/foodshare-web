/**
 * Robust Upload Utilities
 *
 * Provides retry logic, circuit breaker, timeout handling,
 * and error classification for resilient file uploads.
 */

// ============================================================================
// Types
// ============================================================================

export type UploadErrorType =
  | "cors" // CORS preflight failed
  | "network" // Network connectivity issue
  | "timeout" // Request timed out
  | "server" // Server returned error (5xx)
  | "client" // Client error (4xx)
  | "aborted" // Request was aborted
  | "unknown"; // Unknown error

export type UploadError = {
  type: UploadErrorType;
  message: string;
  retriable: boolean;
  statusCode?: number;
  originalError?: Error;
};

export type RetryConfig = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
};

export type CircuitState = {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
};

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000, // 30 second timeout per request
};

// Circuit breaker config
const CIRCUIT_FAILURE_THRESHOLD = 3; // Open circuit after 3 failures
const CIRCUIT_RESET_MS = 60000; // Reset after 1 minute

// R2 circuit state (in-memory, resets on page reload)
let r2CircuitState: CircuitState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify an error to determine if it's retriable and what type it is
 */
export function classifyError(error: unknown, response?: Response): UploadError {
  // Handle AbortError (timeout or manual abort)
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      type: "aborted",
      message: "Upload was aborted or timed out",
      retriable: true,
      originalError: error,
    };
  }

  // Handle TypeError (usually CORS or network issues)
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();

    // CORS errors typically manifest as "Failed to fetch" or "Network request failed"
    if (message.includes("failed to fetch") || message.includes("network request failed")) {
      // Could be CORS or network - check if we have a response
      if (!response) {
        return {
          type: "cors",
          message: "Request blocked (likely CORS policy)",
          retriable: false, // CORS won't fix itself with retries
          originalError: error,
        };
      }
    }

    // Network errors
    if (message.includes("network") || message.includes("internet")) {
      return {
        type: "network",
        message: "Network connectivity issue",
        retriable: true,
        originalError: error,
      };
    }
  }

  // Handle HTTP response errors
  if (response) {
    const statusCode = response.status;

    // Server errors (5xx) are retriable
    if (statusCode >= 500) {
      return {
        type: "server",
        message: `Server error: ${statusCode}`,
        retriable: true,
        statusCode,
      };
    }

    // Client errors (4xx) are generally not retriable
    if (statusCode >= 400) {
      // Except for 408 (timeout), 429 (rate limit), 423 (locked)
      const retriable = [408, 429, 423].includes(statusCode);
      return {
        type: "client",
        message: `Client error: ${statusCode}`,
        retriable,
        statusCode,
      };
    }
  }

  // Unknown error
  return {
    type: "unknown",
    message: error instanceof Error ? error.message : "Unknown upload error",
    retriable: true, // Assume retriable for unknown errors
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * Check if an error indicates a CORS issue
 */
export function isCorsError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return message.includes("failed to fetch") || message.includes("cors");
  }
  return false;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Check if R2 circuit breaker is open (should skip R2)
 */
export function isR2CircuitOpen(): boolean {
  // Check if circuit should reset
  if (r2CircuitState.isOpen) {
    const timeSinceFailure = Date.now() - r2CircuitState.lastFailure;
    if (timeSinceFailure > CIRCUIT_RESET_MS) {
      console.log("[CircuitBreaker] R2 circuit reset after timeout");
      resetR2Circuit();
      return false;
    }
  }
  return r2CircuitState.isOpen;
}

/**
 * Record an R2 failure
 */
export function recordR2Failure(): void {
  r2CircuitState.failures++;
  r2CircuitState.lastFailure = Date.now();

  if (r2CircuitState.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    r2CircuitState.isOpen = true;
    console.log(
      `[CircuitBreaker] R2 circuit OPEN after ${r2CircuitState.failures} failures. ` +
        `Will reset in ${CIRCUIT_RESET_MS / 1000}s`
    );
  }
}

/**
 * Record an R2 success (reset failure count)
 */
export function recordR2Success(): void {
  if (r2CircuitState.failures > 0) {
    console.log("[CircuitBreaker] R2 success, resetting failure count");
  }
  r2CircuitState.failures = 0;
}

/**
 * Reset the R2 circuit breaker
 */
export function resetR2Circuit(): void {
  r2CircuitState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };
}

/**
 * Get current circuit state (for debugging)
 */
export function getR2CircuitState(): CircuitState {
  return { ...r2CircuitState };
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * Math.random() * 0.25;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retries and exponential backoff
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: UploadError, delay: number) => void
): Promise<T> {
  let lastError: UploadError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      // Classify the error
      lastError = classifyError(error);

      // Don't retry non-retriable errors
      if (!lastError.retriable) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, config);

      // Notify caller of retry
      if (onRetry) {
        onRetry(attempt + 1, lastError, delay);
      }

      console.log(
        `[Retry] Attempt ${attempt + 1}/${config.maxRetries} failed: ${lastError.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
      );

      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError || { type: "unknown", message: "All retries exhausted", retriable: false };
}

// ============================================================================
// Fetch with Timeout
// ============================================================================

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = DEFAULT_RETRY_CONFIG.timeoutMs, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Upload Helpers
// ============================================================================

/**
 * Perform a robust upload with retries, timeout, and error handling
 */
export async function robustUpload(
  url: string,
  file: File | Blob,
  headers: Record<string, string> = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ success: boolean; response?: Response; error?: UploadError }> {
  try {
    const response = await withRetry(
      async (signal) => {
        const res = await fetch(url, {
          method: "PUT",
          headers,
          body: file,
          signal,
        });

        // Throw on non-2xx responses to trigger retry logic
        if (!res.ok) {
          const error = new Error(`HTTP ${res.status}`);
          const classified = classifyError(error, res);
          if (classified.retriable) {
            throw error;
          }
          // Non-retriable HTTP error - return response for caller to handle
          return res;
        }

        return res;
      },
      config,
      (attempt, error, delay) => {
        console.log(
          `[robustUpload] Retry ${attempt}: ${error.message}, waiting ${Math.round(delay)}ms`
        );
      }
    );

    return { success: response.ok, response };
  } catch (error) {
    const uploadError = error as UploadError;
    return { success: false, error: uploadError };
  }
}

/**
 * Format error for user display
 */
export function formatUploadError(error: UploadError): string {
  switch (error.type) {
    case "cors":
      return "Upload blocked by security policy. Please try again.";
    case "network":
      return "Network connection issue. Please check your internet and try again.";
    case "timeout":
      return "Upload timed out. Please try again with a smaller file or better connection.";
    case "server":
      return "Server is temporarily unavailable. Please try again in a moment.";
    case "client":
      if (error.statusCode === 413) {
        return "File is too large. Please use a smaller file.";
      }
      if (error.statusCode === 429) {
        return "Too many requests. Please wait a moment and try again.";
      }
      return "Upload failed. Please check your file and try again.";
    case "aborted":
      return "Upload was cancelled. Please try again.";
    default:
      return "Upload failed. Please try again.";
  }
}
