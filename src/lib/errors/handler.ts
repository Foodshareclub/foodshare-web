/**
 * API Error Handler
 * Centralized error handling with retry logic and logging
 */

import type { ApiError, AppError, ErrorCode, ErrorContext } from "./types";
import { createApiError, isApiError } from "./api";
import { mapSupabaseError, isSupabaseError } from "./supabase";
import { generateRequestId } from "./api";
import { isAppError } from "./guards";

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * API Error Handler class
 * Provides standardized error handling, retry logic, and logging
 */
export class ApiErrorHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Handle an error and convert it to a standardized ApiError
   */
  handle(error: unknown, context: ErrorContext): ApiError {
    const requestId = context.requestId || generateRequestId();

    // Already an ApiError
    if (isApiError(error)) {
      return { ...error, requestId };
    }

    // Supabase/Postgres error
    if (isSupabaseError(error)) {
      const code = mapSupabaseError(error);
      const apiError = createApiError(code, error.message || "Database error", {
        originalCode: error.code,
        hint: error.hint,
        details: error.details,
      });
      apiError.requestId = requestId;

      this.logError(apiError, context);
      return apiError;
    }

    // Standard Error
    if (error instanceof Error) {
      const code = this.inferErrorCode(error);
      const apiError = createApiError(code, error.message, {
        name: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
      apiError.requestId = requestId;

      this.logError(apiError, context);
      return apiError;
    }

    // Unknown error type
    const apiError = createApiError("UNKNOWN_ERROR", String(error));
    apiError.requestId = requestId;

    this.logError(apiError, context);
    return apiError;
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error: ApiError, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    return error.retryable;
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   */
  getRetryDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const delay = this.config.baseDelayMs * Math.pow(2, attempt);
    // Add jitter (+-25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    // Cap at maxDelay
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * Execute a function with automatic retry on failure
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    context: Omit<ErrorContext, "timestamp" | "requestId">
  ): Promise<T> {
    const requestId = generateRequestId();
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date(),
      requestId,
    };

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.handle(error, fullContext);

        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        const delay = this.getRetryDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Log error with context
   */
  private logError(error: ApiError, context: ErrorContext): void {
    const logEntry = {
      level: error.code === "SERVER_ERROR" ? "error" : "warn",
      code: error.code,
      message: error.message,
      operation: context.operation,
      table: context.table,
      userId: context.userId,
      requestId: error.requestId,
      timestamp: context.timestamp.toISOString(),
      retryable: error.retryable,
    };

    if (process.env.NODE_ENV === "development") {
      console.error("[API Error]", logEntry);
    }
  }

  /**
   * Infer error code from standard Error
   */
  private inferErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "NETWORK_ERROR";
    }
    if (message.includes("unauthorized") || message.includes("auth")) {
      return "AUTH_ERROR";
    }
    if (message.includes("not found")) {
      return "NOT_FOUND";
    }

    return "UNKNOWN_ERROR";
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default singleton instance
 */
export const apiErrorHandler = new ApiErrorHandler();

// ============================================================================
// User-Friendly Error Messages (from primary error system)
// ============================================================================

/**
 * Convert AppError code to user-friendly message
 */
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

/**
 * Get a suggestion for how to resolve an AppError
 */
export function getAppErrorSuggestion(error: AppError): string {
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
}

/**
 * Check if an unknown error is a network error (using AppError check)
 */
export const isNetworkErrorFromAppError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("network");

/**
 * Check if an unknown error is an auth-related AppError
 */
export const isAuthErrorFromAppError = (error: unknown) =>
  isAppError(error) && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN");

/**
 * Sanitize error message by removing special HTML characters
 */
export const sanitizeAppErrorMessage = (msg: string) => msg.replace(/[<>&'"]/g, "");
