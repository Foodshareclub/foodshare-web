/**
 * Enterprise Module Test Utilities
 *
 * Specialized test utilities for testing the enterprise client modules:
 * - Circuit breaker
 * - Retry logic
 * - Offline queue
 * - Caching
 * - Realtime subscriptions
 *
 * @module lib/testing/enterprise-test-utils
 */

import { CircuitBreaker, CircuitState } from "../api/circuit-breaker";
import { RetryConfig } from "../api/retry";

// =============================================================================
// Circuit Breaker Testing
// =============================================================================

/**
 * Create a circuit breaker with test-friendly defaults
 */
export function createTestCircuitBreaker(
  overrides: Partial<{
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenRequests: number;
  }> = {}
): CircuitBreaker {
  return new CircuitBreaker({
    name: "test-breaker",
    failureThreshold: overrides.failureThreshold ?? 2,
    resetTimeoutMs: overrides.resetTimeoutMs ?? 100,
    halfOpenRequests: overrides.halfOpenRequests ?? 1,
  });
}

/**
 * Force circuit breaker to a specific state (for testing)
 */
export function forceCircuitState(
  breaker: CircuitBreaker,
  state: CircuitState
): void {
  if (state === "OPEN") {
    // Trigger enough failures to open the circuit (use default threshold of 5)
    for (let i = 0; i < 6; i++) {
      breaker.execute(() => Promise.reject(new Error("forced failure"))).catch(() => {});
    }
  }
  // Note: HALF_OPEN and CLOSED states require waiting for timeout or using forceState
}

/**
 * Wait for circuit breaker to transition to a state
 */
export async function waitForCircuitState(
  breaker: CircuitBreaker,
  targetState: CircuitState,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const metrics = breaker.getMetrics();
    if (metrics.state === targetState) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(
    `Circuit breaker did not reach state ${targetState} within ${timeoutMs}ms`
  );
}

/**
 * Create a function that fails N times then succeeds
 */
export function createFailingThenSucceedingFn<T>(
  failCount: number,
  successValue: T,
  errorMessage: string = "Simulated failure"
): () => Promise<T> {
  let callCount = 0;

  return async () => {
    callCount++;
    if (callCount <= failCount) {
      throw new Error(errorMessage);
    }
    return successValue;
  };
}

// =============================================================================
// Retry Testing
// =============================================================================

/**
 * Test-friendly retry config with minimal delays
 */
export const testRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 10,
  maxDelayMs: 50,
  backoffMultiplier: 1.5,
  jitter: false,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Track retry attempts
 */
export function createRetryTracker<T>(
  fn: () => Promise<T>
): {
  execute: () => Promise<T>;
  attempts: number[];
  reset: () => void;
} {
  const attempts: number[] = [];

  return {
    execute: async () => {
      attempts.push(Date.now());
      return fn();
    },
    attempts,
    reset: () => {
      attempts.length = 0;
    },
  };
}

/**
 * Calculate actual delays between retry attempts
 */
export function calculateRetryDelays(attempts: number[]): number[] {
  const delays: number[] = [];
  for (let i = 1; i < attempts.length; i++) {
    delays.push(attempts[i] - attempts[i - 1]);
  }
  return delays;
}

// =============================================================================
// Offline Queue Testing
// =============================================================================

/**
 * Mock IndexedDB for offline queue testing
 */
export class MockIndexedDBStore {
  private store: Map<string, unknown> = new Map();

  async get(key: string): Promise<unknown> {
    return this.store.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAll(): Promise<unknown[]> {
    return Array.from(this.store.values());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Create mock online/offline events
 */
export function createNetworkSimulator() {
  let isOnline = true;
  const listeners: { online: (() => void)[]; offline: (() => void)[] } = {
    online: [],
    offline: [],
  };

  return {
    get isOnline() {
      return isOnline;
    },

    goOnline: () => {
      isOnline = true;
      listeners.online.forEach((fn) => fn());
    },

    goOffline: () => {
      isOnline = false;
      listeners.offline.forEach((fn) => fn());
    },

    addEventListener: (event: "online" | "offline", fn: () => void) => {
      listeners[event].push(fn);
    },

    removeEventListener: (event: "online" | "offline", fn: () => void) => {
      const index = listeners[event].indexOf(fn);
      if (index > -1) {
        listeners[event].splice(index, 1);
      }
    },

    reset: () => {
      isOnline = true;
      listeners.online = [];
      listeners.offline = [];
    },
  };
}

// =============================================================================
// Cache Testing
// =============================================================================

/**
 * Create a mock cache layer for testing
 */
export function createMockCacheLayer() {
  const cache = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    get: async <T>(key: string): Promise<T | null> => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
      }
      return entry.value as T;
    },

    set: async <T>(key: string, value: T, ttl: number = 60000): Promise<void> => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    },

    delete: async (key: string): Promise<void> => {
      cache.delete(key);
    },

    clear: async (): Promise<void> => {
      cache.clear();
    },

    has: (key: string): boolean => {
      const entry = cache.get(key);
      if (!entry) return false;
      if (entry.expiresAt < Date.now()) {
        cache.delete(key);
        return false;
      }
      return true;
    },

    size: () => cache.size,

    // Test helpers
    _getAll: () => new Map(cache),
    _setExpired: (key: string) => {
      const entry = cache.get(key);
      if (entry) {
        entry.expiresAt = Date.now() - 1;
      }
    },
  };
}

// =============================================================================
// Realtime Testing
// =============================================================================

/**
 * Mock Supabase realtime channel for testing
 */
export function createMockRealtimeChannel() {
  const subscriptions: Map<
    string,
    {
      event: string;
      callback: (payload: unknown) => void;
    }
  > = new Map();

  let status: "SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" = "CLOSED";

  return {
    on: (
      event: string,
      filter: unknown,
      callback: (payload: unknown) => void
    ) => {
      const id = `${event}-${Date.now()}`;
      subscriptions.set(id, { event, callback });
      return {
        subscribe: (statusCallback?: (status: string) => void) => {
          status = "SUBSCRIBED";
          statusCallback?.("SUBSCRIBED");
          return { unsubscribe: () => {} };
        },
      };
    },

    subscribe: (callback?: (status: string) => void) => {
      status = "SUBSCRIBED";
      callback?.("SUBSCRIBED");
      return { unsubscribe: () => {} };
    },

    unsubscribe: () => {
      status = "CLOSED";
      subscriptions.clear();
    },

    // Test helpers
    _emit: (event: string, payload: unknown) => {
      subscriptions.forEach((sub) => {
        if (sub.event === event || sub.event === "*") {
          sub.callback(payload);
        }
      });
    },

    _getStatus: () => status,

    _simulateError: () => {
      status = "CHANNEL_ERROR";
    },

    _simulateReconnect: () => {
      status = "SUBSCRIBED";
    },
  };
}

/**
 * Create mock presence state
 */
export function createMockPresence() {
  const presenceState: Map<string, unknown> = new Map();

  return {
    track: async (state: unknown) => {
      presenceState.set("self", state);
    },

    untrack: async () => {
      presenceState.delete("self");
    },

    onSync: (callback: () => void) => {
      // Immediately call for testing
      callback();
    },

    onJoin: (callback: (key: string, currentPresences: unknown, newPresences: unknown) => void) => {
      // Store for later triggering
      return { callback };
    },

    onLeave: (callback: (key: string, currentPresences: unknown, leftPresences: unknown) => void) => {
      // Store for later triggering
      return { callback };
    },

    // Test helpers
    _getState: () => new Map(presenceState),
    _simulateJoin: (userId: string, state: unknown) => {
      presenceState.set(userId, state);
    },
    _simulateLeave: (userId: string) => {
      presenceState.delete(userId);
    },
  };
}

// =============================================================================
// Timing Utilities
// =============================================================================

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Run all pending timers and promises
 */
export async function runAllTimersAndFlush(): Promise<void> {
  jest.runAllTimers();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// =============================================================================
// Metrics Testing
// =============================================================================

/**
 * Capture metrics during test execution
 */
export function createMetricsCapture() {
  const metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
  }> = [];

  return {
    record: (
      name: string,
      value: number,
      tags?: Record<string, string>
    ) => {
      metrics.push({
        name,
        value,
        timestamp: Date.now(),
        tags,
      });
    },

    getMetrics: (name?: string) => {
      if (name) {
        return metrics.filter((m) => m.name === name);
      }
      return [...metrics];
    },

    getLatest: (name: string) => {
      const filtered = metrics.filter((m) => m.name === name);
      return filtered[filtered.length - 1];
    },

    clear: () => {
      metrics.length = 0;
    },

    count: (name?: string) => {
      if (name) {
        return metrics.filter((m) => m.name === name).length;
      }
      return metrics.length;
    },
  };
}
