/**
 * Timeout utility for preventing long-running operations
 */

import { TimeoutError, logError } from "./errors.ts";

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(errorMessage, errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    exponentialBackoff?: boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, exponentialBackoff = true, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        logError(error, { context: "withRetry", attempt, maxRetries });
        throw error;
      }

      const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      if (onRetry) {
        onRetry(attempt, error);
      }

      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Execute multiple promises with a timeout for the entire batch
 */
export async function withBatchTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  errorMessage: string = "Batch operation timed out"
): Promise<PromiseSettledResult<T>[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(errorMessage, errorMessage)), timeoutMs)
  );

  return Promise.race([Promise.allSettled(promises), timeout]) as Promise<
    PromiseSettledResult<T>[]
  >;
}
