/**
 * Custom error classes and error handling utilities
 */

export class BotError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "BotError";
  }
}

export class ValidationError extends BotError {
  constructor(message: string, userMessage: string) {
    super(message, userMessage, "VALIDATION_ERROR", false);
    this.name = "ValidationError";
  }
}

export class NetworkError extends BotError {
  constructor(message: string, userMessage: string) {
    super(message, userMessage, "NETWORK_ERROR", true);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends BotError {
  constructor(message: string, userMessage: string) {
    super(message, userMessage, "TIMEOUT_ERROR", true);
    this.name = "TimeoutError";
  }
}

export class DatabaseError extends BotError {
  constructor(message: string, userMessage: string) {
    super(message, userMessage, "DATABASE_ERROR", true);
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends BotError {
  constructor(
    message: string,
    userMessage: string,
    public service: string
  ) {
    super(message, userMessage, "EXTERNAL_SERVICE_ERROR", true);
    this.name = "ExternalServiceError";
  }
}

/**
 * Safe error logging that doesn't expose sensitive data
 */
export function logError(error: unknown, context: Record<string, any> = {}) {
  const sanitizedContext = { ...context };

  // Remove sensitive fields
  delete sanitizedContext.token;
  delete sanitizedContext.password;
  delete sanitizedContext.api_key;
  delete sanitizedContext.verification_code;

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      context: sanitizedContext,
    })
  );
}

/**
 * Wrap async operations with comprehensive error handling
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logError(error, { context });
    return fallback ?? null;
  }
}
