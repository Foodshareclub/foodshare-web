/**
 * Robust Rate Limiting with Circuit Breaker & Request Queue
 * Handles API rate limits, exponential backoff, and circuit breaker pattern
 */

import type { CircuitBreaker, CircuitState, QueuedRequest, ErrorClassification } from "./types";
import { CIRCUIT_BREAKER_CONFIG, RATE_LIMIT_CONFIG } from "./config";

// Global state
let lastApiCallTime = 0;
let circuitBreaker: CircuitBreaker = {
  state: "CLOSED",
  failures: 0,
  lastFailureTime: 0,
  nextRetryTime: 0,
};
const requestQueue: QueuedRequest<unknown>[] = [];
let isProcessingQueue = false;

/**
 * Sleep helper with optional abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Sleep aborted"));
    });
  });
}

/**
 * Add jitter to delay to prevent thundering herd
 */
function addJitter(delayMs: number): number {
  const jitter = delayMs * RATE_LIMIT_CONFIG.jitterFactor * Math.random();
  return Math.floor(delayMs + jitter);
}

/**
 * Calculate exponential backoff delay with jitter and cap
 */
function calculateBackoffDelay(attempt: number, retryAfterHeader?: number): number {
  // If server provided Retry-After, use it
  if (retryAfterHeader && retryAfterHeader > 0) {
    return Math.min(retryAfterHeader * 1000, RATE_LIMIT_CONFIG.maxDelayMs);
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RATE_LIMIT_CONFIG.maxDelayMs);
  return addJitter(cappedDelay);
}

/**
 * Classify error type for appropriate handling
 */
export function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  const errorStr = String(error);

  // Extract Retry-After if present
  const retryAfterMatch = errorStr.match(/retry[- ]?after[:\s]*(\d+)/i);
  const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : undefined;

  const isRateLimit =
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("quota exceeded") ||
    message.includes("throttl");

  const isTimeout =
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout") ||
    message.includes("econnreset");

  const isNetworkError =
    message.includes("network") ||
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("fetch failed") ||
    message.includes("socket hang up");

  const isTransient =
    isRateLimit ||
    isTimeout ||
    isNetworkError ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("service unavailable") ||
    message.includes("internal server error");

  // Don't retry auth errors, bad requests, or permanent failures
  const isPermanentError =
    message.includes("401") ||
    message.includes("403") ||
    message.includes("400") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden");

  return {
    isRateLimit,
    isTransient,
    isTimeout,
    isNetworkError,
    retryAfter,
    shouldRetry: isTransient && !isPermanentError,
  };
}

/**
 * Update circuit breaker state based on result
 */
function recordSuccess(): void {
  circuitBreaker = {
    state: "CLOSED",
    failures: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };
}

function recordFailure(): void {
  const now = Date.now();
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = now;

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    circuitBreaker.state = "OPEN";
    circuitBreaker.nextRetryTime = now + CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;
    console.warn(
      `[xAI Circuit Breaker] OPEN - Too many failures. Will retry after ${new Date(circuitBreaker.nextRetryTime).toISOString()}`
    );
  }
}

/**
 * Check if circuit breaker allows request
 */
function canMakeRequest(): { allowed: boolean; waitMs?: number; reason?: string } {
  const now = Date.now();

  if (circuitBreaker.state === "CLOSED") {
    return { allowed: true };
  }

  if (circuitBreaker.state === "OPEN") {
    if (now >= circuitBreaker.nextRetryTime) {
      // Transition to half-open
      circuitBreaker.state = "HALF_OPEN";
      console.warn("[xAI Circuit Breaker] HALF_OPEN - Testing with single request");
      return { allowed: true };
    }
    return {
      allowed: false,
      waitMs: circuitBreaker.nextRetryTime - now,
      reason: "Circuit breaker is OPEN due to repeated failures",
    };
  }

  // HALF_OPEN - allow limited requests
  return { allowed: true };
}

/**
 * Process queued requests sequentially
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (requestQueue.length > 0) {
      const request = requestQueue[0];
      if (!request) break;

      // Check if request has been waiting too long
      const waitTime = Date.now() - request.addedAt;
      if (waitTime > RATE_LIMIT_CONFIG.queueTimeoutMs) {
        requestQueue.shift();
        request.reject(new Error("Request timed out waiting in queue"));
        continue;
      }

      // Check circuit breaker
      const circuitCheck = canMakeRequest();
      if (!circuitCheck.allowed) {
        // Wait and retry
        await sleep(Math.min(circuitCheck.waitMs || 5000, 10000));
        continue;
      }

      // Enforce minimum interval
      const timeSinceLastCall = Date.now() - lastApiCallTime;
      if (timeSinceLastCall < RATE_LIMIT_CONFIG.minIntervalMs) {
        await sleep(RATE_LIMIT_CONFIG.minIntervalMs - timeSinceLastCall);
      }

      // Execute request
      requestQueue.shift();
      try {
        lastApiCallTime = Date.now();
        const result = await request.fn();
        recordSuccess();
        request.resolve(result as never);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const classification = classifyError(err);

        if (classification.isRateLimit) {
          recordFailure();
        }

        request.reject(err);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Execute API call with comprehensive rate limit handling
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Request queuing
 * - Timeout handling
 */
export async function executeWithRateLimitHandling<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT_CONFIG.maxRetries
): Promise<T> {
  // Check circuit breaker first
  const circuitCheck = canMakeRequest();
  if (!circuitCheck.allowed) {
    throw new Error(
      `AI service temporarily unavailable. ${circuitCheck.reason}. Please try again in ${Math.ceil((circuitCheck.waitMs || 0) / 1000)} seconds.`
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Enforce minimum interval between calls
    const timeSinceLastCall = Date.now() - lastApiCallTime;
    if (timeSinceLastCall < RATE_LIMIT_CONFIG.minIntervalMs) {
      await sleep(RATE_LIMIT_CONFIG.minIntervalMs - timeSinceLastCall);
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RATE_LIMIT_CONFIG.requestTimeoutMs);

      lastApiCallTime = Date.now();

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        recordSuccess();
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const classification = classifyError(lastError);

      // Log attempt details
      console.warn(`[xAI API] Attempt ${attempt + 1}/${maxRetries} failed:`, {
        error: lastError.message,
        isRateLimit: classification.isRateLimit,
        isTransient: classification.isTransient,
        shouldRetry: classification.shouldRetry,
      });

      // Update circuit breaker on rate limit
      if (classification.isRateLimit) {
        recordFailure();
      }

      // Check if we should retry
      if (!classification.shouldRetry) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries - 1) {
        break;
      }

      // Calculate delay with backoff
      const delayMs = calculateBackoffDelay(attempt, classification.retryAfter);
      console.warn(
        `[xAI API] Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt + 2}/${maxRetries}...`
      );

      await sleep(delayMs);
    }
  }

  // All retries exhausted
  const finalError = new Error(
    `AI service request failed after ${maxRetries} attempts. ${lastError?.message || "Unknown error"}. Please try again later.`
  );
  throw finalError;
}

/**
 * Queue a request for rate-limited execution
 * Use this for non-critical requests that can wait
 */
export function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      addedAt: Date.now(),
    });
    processQueue();
  });
}

/**
 * Get current rate limiter status (for debugging/monitoring)
 */
export function getRateLimiterStatus(): {
  circuitState: CircuitState;
  failures: number;
  queueLength: number;
  lastCallTime: number;
} {
  return {
    circuitState: circuitBreaker.state,
    failures: circuitBreaker.failures,
    queueLength: requestQueue.length,
    lastCallTime: lastApiCallTime,
  };
}

/**
 * Reset circuit breaker (for admin use)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker = {
    state: "CLOSED",
    failures: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };
  console.warn("[xAI Circuit Breaker] Manually reset to CLOSED state");
}
