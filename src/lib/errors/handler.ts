/**
 * API Error Handler
 * Centralized error handling with retry logic and logging
 */

import type { ApiError, ErrorCode, ErrorContext } from "./types";
import { createApiError, isApiError } from "./api";
import { mapSupabaseError, isSupabaseError } from "./supabase";
import { generateRequestId } from "./api";

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
