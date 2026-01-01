/**
 * Retry with Exponential Backoff
 *
 * Provides configurable retry logic for transient failures.
 * SYNC: Mirrors Android EdgeFunctionClient retry logic
 *
 * @module lib/api/retry
 */

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 500) */
  initialDelayMs?: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** HTTP status codes that should trigger retry */
  retryableStatuses?: number[];
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  isRetryable: () => true,
  onRetry: () => {},
};

/**
 * Calculate delay for a given attempt with exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Pick<
    Required<RetryConfig>,
    "initialDelayMs" | "maxDelayMs" | "backoffMultiplier" | "jitter"
  >
): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitter } = config;

  // Exponential backoff: initialDelay * multiplier^attempt
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);

  // Add jitter (±25%) to prevent thundering herd
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
    delay = Math.floor(delay * jitterFactor);
  }

  return delay;
}

/**
 * Check if an error is retryable based on configuration
 */
export function isRetryableError(
  error: unknown,
  config: Pick<Required<RetryConfig>, "retryableStatuses" | "isRetryable">
): boolean {
  // Check custom isRetryable function first
  if (!config.isRetryable(error)) {
    return false;
  }

  // Check for network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Check for timeout errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("abort")
    ) {
      return true;
    }
  }

  // Check for HTTP status codes
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return config.retryableStatuses.includes(status);
  }

  // Check for Response objects
  if (error instanceof Response) {
    return config.retryableStatuses.includes(error.status);
  }

  return false;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetch('/api/products'),
 *   { maxRetries: 3, initialDelayMs: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxRetries, onRetry } = mergedConfig;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxRetries;
      const shouldRetry = !isLastAttempt && isRetryableError(error, mergedConfig);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay and wait
      const delayMs = calculateBackoffDelay(attempt, mergedConfig);
      onRetry(attempt + 1, error, delayMs);

      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Create a retry wrapper with pre-configured options
 *
 * @example
 * ```ts
 * const retryFetch = createRetryWrapper({ maxRetries: 5 });
 * const result = await retryFetch(() => fetch('/api/products'));
 * ```
 */
export function createRetryWrapper(
  defaultConfig: RetryConfig = {}
): <T>(fn: () => Promise<T>, overrideConfig?: RetryConfig) => Promise<T> {
  return <T>(fn: () => Promise<T>, overrideConfig: RetryConfig = {}) => {
    return withRetry(fn, { ...defaultConfig, ...overrideConfig });
  };
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  /** Standard retry: 3 attempts, 500ms initial delay */
  standard: {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 10000,
  } as RetryConfig,

  /** Aggressive retry: 5 attempts, 200ms initial delay */
  aggressive: {
    maxRetries: 5,
    initialDelayMs: 200,
    maxDelayMs: 5000,
  } as RetryConfig,

  /** Conservative retry: 2 attempts, 1s initial delay */
  conservative: {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  } as RetryConfig,

  /** No retry */
  none: {
    maxRetries: 0,
  } as RetryConfig,

  /** Rate limit aware: longer delays for 429 responses */
  rateLimitAware: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    retryableStatuses: [429, 503],
  } as RetryConfig,
} as const;
