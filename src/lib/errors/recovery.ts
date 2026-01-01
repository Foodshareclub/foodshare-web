/**
 * Error Recovery Strategies
 *
 * Automatic recovery from errors:
 * - Retry with backoff
 * - Fallback to cached data
 * - Graceful degradation
 * - User-prompted recovery
 *
 * @module lib/errors/recovery
 */

import { cacheGet } from "@/lib/cache";
import { withRetry, RetryConfig, RetryPresets } from "@/lib/api/retry";

// =============================================================================
// Types
// =============================================================================

export type RecoveryStrategyType = "retry" | "cache" | "degrade" | "prompt";

export interface RetryStrategy {
  type: "retry";
  config: RetryConfig;
}

export interface CacheStrategy {
  type: "cache";
  /** Cache key to fallback to */
  cacheKey: string;
  /** Maximum age of cached data in ms */
  maxAge?: number;
}

export interface DegradeStrategy {
  type: "degrade";
  /** Fallback value to return */
  fallbackValue: unknown;
  /** Log degradation */
  logDegradation?: boolean;
}

export interface PromptStrategy {
  type: "prompt";
  /** Title for the prompt */
  title: string;
  /** Message for the prompt */
  message: string;
  /** Retry button text */
  retryText?: string;
  /** Cancel button text */
  cancelText?: string;
}

export type RecoveryStrategy =
  | RetryStrategy
  | CacheStrategy
  | DegradeStrategy
  | PromptStrategy;

export interface RecoveryConfig {
  /** Strategies to try in order */
  strategies: RecoveryStrategy[];
  /** Callback when recovery succeeds */
  onRecoverySuccess?: (strategy: RecoveryStrategy, result: unknown) => void;
  /** Callback when all recovery fails */
  onRecoveryFailed?: (error: unknown, strategies: RecoveryStrategy[]) => void;
}

export interface RecoveryResult<T> {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovered data */
  data?: T;
  /** Strategy that succeeded */
  strategy?: RecoveryStrategy;
  /** Error if all strategies failed */
  error?: unknown;
  /** Whether data is stale (from cache) */
  isStale?: boolean;
  /** Whether data is degraded (fallback) */
  isDegraded?: boolean;
}

// =============================================================================
// Recovery Executor
// =============================================================================

/**
 * Execute recovery strategies in order
 */
export async function executeRecovery<T>(
  operation: () => Promise<T>,
  config: RecoveryConfig
): Promise<RecoveryResult<T>> {
  const { strategies, onRecoverySuccess, onRecoveryFailed } = config;

  for (const strategy of strategies) {
    try {
      const result = await executeStrategy<T>(operation, strategy);

      if (result.success) {
        onRecoverySuccess?.(strategy, result.data);
        return result;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // All strategies failed
  const error = new Error("All recovery strategies failed");
  onRecoveryFailed?.(error, strategies);

  return {
    success: false,
    error,
  };
}

/**
 * Execute a single recovery strategy
 */
async function executeStrategy<T>(
  operation: () => Promise<T>,
  strategy: RecoveryStrategy
): Promise<RecoveryResult<T>> {
  switch (strategy.type) {
    case "retry":
      return executeRetryStrategy(operation, strategy);

    case "cache":
      return executeCacheStrategy<T>(strategy);

    case "degrade":
      return executeDegradeStrategy<T>(strategy);

    case "prompt":
      return executePromptStrategy(operation, strategy);

    default:
      return { success: false, error: new Error("Unknown strategy") };
  }
}

/**
 * Execute retry strategy
 */
async function executeRetryStrategy<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy
): Promise<RecoveryResult<T>> {
  try {
    const data = await withRetry(operation, strategy.config);
    return { success: true, data, strategy };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Execute cache fallback strategy
 */
async function executeCacheStrategy<T>(
  strategy: CacheStrategy
): Promise<RecoveryResult<T>> {
  const cached = await cacheGet<{ data: T; timestamp: number }>(strategy.cacheKey);

  if (!cached) {
    return { success: false, error: new Error("No cached data available") };
  }

  // Check max age
  if (strategy.maxAge) {
    const age = Date.now() - cached.timestamp;
    if (age > strategy.maxAge) {
      return { success: false, error: new Error("Cached data too old") };
    }
  }

  return {
    success: true,
    data: cached.data,
    strategy,
    isStale: true,
  };
}

/**
 * Execute degrade strategy
 */
async function executeDegradeStrategy<T>(
  strategy: DegradeStrategy
): Promise<RecoveryResult<T>> {
  if (strategy.logDegradation) {
    console.warn("[Recovery] Degrading to fallback value");
  }

  return {
    success: true,
    data: strategy.fallbackValue as T,
    strategy,
    isDegraded: true,
  };
}

/**
 * Execute prompt strategy (requires user interaction)
 */
async function executePromptStrategy<T>(
  operation: () => Promise<T>,
  strategy: PromptStrategy
): Promise<RecoveryResult<T>> {
  // In a real implementation, this would show a UI prompt
  // For now, we'll just retry once
  if (typeof window !== "undefined") {
    const shouldRetry = window.confirm(
      `${strategy.title}\n\n${strategy.message}\n\nRetry?`
    );

    if (shouldRetry) {
      try {
        const data = await operation();
        return { success: true, data, strategy };
      } catch (error) {
        return { success: false, error };
      }
    }
  }

  return { success: false, error: new Error("User cancelled") };
}

// =============================================================================
// Recovery Presets
// =============================================================================

/**
 * Standard recovery: retry → cache → degrade
 */
export function createStandardRecovery<T>(
  cacheKey: string,
  fallbackValue: T
): RecoveryConfig {
  return {
    strategies: [
      { type: "retry", config: RetryPresets.standard },
      { type: "cache", cacheKey, maxAge: 5 * 60 * 1000 },
      { type: "degrade", fallbackValue, logDegradation: true },
    ],
  };
}

/**
 * Aggressive recovery: more retries, longer cache
 */
export function createAggressiveRecovery<T>(
  cacheKey: string,
  fallbackValue: T
): RecoveryConfig {
  return {
    strategies: [
      { type: "retry", config: RetryPresets.aggressive },
      { type: "cache", cacheKey, maxAge: 30 * 60 * 1000 },
      { type: "degrade", fallbackValue, logDegradation: true },
    ],
  };
}

/**
 * Interactive recovery: prompt user before degrading
 */
export function createInteractiveRecovery<T>(
  cacheKey: string,
  fallbackValue: T,
  promptMessage: string
): RecoveryConfig {
  return {
    strategies: [
      { type: "retry", config: RetryPresets.conservative },
      { type: "cache", cacheKey, maxAge: 10 * 60 * 1000 },
      {
        type: "prompt",
        title: "Connection Error",
        message: promptMessage,
        retryText: "Try Again",
        cancelText: "Use Offline Data",
      },
      { type: "degrade", fallbackValue, logDegradation: true },
    ],
  };
}

/**
 * Critical recovery: no degradation, must succeed
 */
export function createCriticalRecovery(cacheKey: string): RecoveryConfig {
  return {
    strategies: [
      { type: "retry", config: { ...RetryPresets.aggressive, maxRetries: 10 } },
      { type: "cache", cacheKey, maxAge: 60 * 60 * 1000 },
      {
        type: "prompt",
        title: "Critical Error",
        message: "This operation is required. Please check your connection.",
        retryText: "Retry",
        cancelText: "Cancel",
      },
    ],
  };
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * Hook for using recovery in React components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { execute, isRecovering, lastResult } = useRecovery(
 *     createStandardRecovery('products', [])
 *   );
 *
 *   const loadProducts = async () => {
 *     const result = await execute(() => fetchProducts());
 *     if (result.success) {
 *       setProducts(result.data);
 *       if (result.isStale) {
 *         toast.info('Showing cached data');
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {isRecovering && <Spinner />}
 *       {lastResult?.isDegraded && <OfflineBanner />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRecovery<T>(config: RecoveryConfig) {
  // This would be implemented with React hooks
  // For now, return the execute function
  return {
    execute: (operation: () => Promise<T>) => executeRecovery(operation, config),
    config,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Wrap an async function with recovery
 */
export function withRecovery<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  config: RecoveryConfig
): (...args: Args) => Promise<RecoveryResult<T>> {
  return async (...args: Args) => {
    return executeRecovery(() => fn(...args), config);
  };
}

/**
 * Create a recoverable fetch function
 */
export function createRecoverableFetch<T>(
  url: string,
  options: RequestInit,
  recoveryConfig: RecoveryConfig
): () => Promise<RecoveryResult<T>> {
  return () =>
    executeRecovery(async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json() as Promise<T>;
    }, recoveryConfig);
}
