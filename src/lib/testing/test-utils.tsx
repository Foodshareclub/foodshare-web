/**
 * Test Utilities
 *
 * Custom render functions and utilities for testing React components
 * with all necessary providers and mocks.
 *
 * @module lib/testing/test-utils
 */

import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { mock, expect } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial query client state */
  queryClientConfig?: ConstructorParameters<typeof QueryClient>[0];
  /** Additional providers to wrap the component */
  additionalProviders?: React.ComponentType<{ children: ReactNode }>[];
  /** Initial route for testing */
  initialRoute?: string;
}

// =============================================================================
// Provider Wrapper
// =============================================================================

/**
 * Create a wrapper with all necessary providers
 */
function createWrapper(options: CustomRenderOptions = {}) {
  const { queryClientConfig, additionalProviders = [] } = options;

  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    ...queryClientConfig,
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    let wrapped = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    // Wrap with additional providers (innermost to outermost)
    for (const Provider of additionalProviders.reverse()) {
      wrapped = <Provider>{wrapped}</Provider>;
    }

    return wrapped;
  };
}

// =============================================================================
// Custom Render
// =============================================================================

/**
 * Custom render function with all providers
 */
export function customRender(ui: ReactElement, options: CustomRenderOptions = {}): RenderResult {
  const { queryClientConfig, additionalProviders, ...renderOptions } = options;

  return render(ui, {
    wrapper: createWrapper({ queryClientConfig, additionalProviders }),
    ...renderOptions,
  });
}

// =============================================================================
// Async Utilities
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for network requests to settle
 */
export async function waitForNetworkIdle(
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 5000, idleTime = 100 } = options;
  let lastRequestTime = Date.now();
  const startTime = Date.now();

  // Track fetch calls
  const originalFetch = global.fetch;
  let pendingRequests = 0;

  global.fetch = (async (...args: Parameters<typeof fetch>) => {
    pendingRequests++;
    lastRequestTime = Date.now();
    try {
      return await originalFetch(...args);
    } finally {
      pendingRequests--;
      lastRequestTime = Date.now();
    }
  }) as typeof fetch;

  try {
    while (Date.now() - startTime < timeout) {
      if (pendingRequests === 0 && Date.now() - lastRequestTime >= idleTime) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Network did not become idle within ${timeout}ms`);
  } finally {
    global.fetch = originalFetch;
  }
}

// =============================================================================
// Mock Utilities
// =============================================================================

/**
 * Create a mock function that tracks calls
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>() {
  const calls: Parameters<T>[] = [];
  const fn = ((...args: Parameters<T>) => {
    calls.push(args);
  }) as T & { calls: Parameters<T>[]; reset: () => void };

  fn.calls = calls;
  fn.reset = () => {
    calls.length = 0;
  };

  return fn;
}

/**
 * Mock localStorage for testing
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  const storageMock = {
    getItem: mock((key: string) => store[key] || null),
    setItem: mock((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: mock((key: string) => {
      delete store[key];
    }),
    clear: mock(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: mock((index: number) => Object.keys(store)[index] || null),
  };

  Object.defineProperty(window, "localStorage", { value: storageMock });

  return {
    mock: storageMock,
    reset: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
}

/**
 * Mock IndexedDB for testing offline queue
 */
export function mockIndexedDB() {
  const databases: Record<string, Record<string, unknown[]>> = {};

  const idbMock = {
    open: mock((name: string) => {
      if (!databases[name]) {
        databases[name] = {};
      }

      return {
        result: {
          objectStoreNames: {
            contains: (storeName: string) => !!databases[name][storeName],
          },
          createObjectStore: (storeName: string) => {
            databases[name][storeName] = [];
            return {
              createIndex: mock(),
            };
          },
          transaction: (_storeNames: string[], _mode: string) => ({
            objectStore: (storeName: string) => ({
              add: mock((item: unknown) => {
                databases[name][storeName].push(item);
                return { onsuccess: null };
              }),
              put: mock((item: unknown) => {
                databases[name][storeName].push(item);
                return { onsuccess: null };
              }),
              get: mock((key: string) => ({
                result: databases[name][storeName].find(
                  (item) => (item as Record<string, unknown>).id === key
                ),
                onsuccess: null,
              })),
              getAll: mock(() => ({
                result: databases[name][storeName],
                onsuccess: null,
              })),
              delete: mock((key: string) => {
                databases[name][storeName] = databases[name][storeName].filter(
                  (item) => (item as Record<string, unknown>).id !== key
                );
                return { onsuccess: null };
              }),
              clear: mock(() => {
                databases[name][storeName] = [];
                return { onsuccess: null };
              }),
            }),
            oncomplete: null,
            onerror: null,
          }),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
    }),
    deleteDatabase: mock((name: string) => {
      delete databases[name];
      return { onsuccess: null };
    }),
  };

  Object.defineProperty(window, "indexedDB", { value: idbMock });

  return {
    mock: idbMock,
    databases,
    reset: () => {
      Object.keys(databases).forEach((key) => delete databases[key]);
    },
  };
}

/**
 * Mock navigator.onLine for offline testing
 */
export function mockOnlineStatus(isOnline: boolean = true) {
  Object.defineProperty(navigator, "onLine", {
    value: isOnline,
    writable: true,
    configurable: true,
  });

  return {
    setOnline: () => {
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    },
    setOffline: () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    },
  };
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that a function was called with specific arguments
 */
export function expectCalledWith(fn: ReturnType<typeof mock>, ...args: unknown[]) {
  expect(fn).toHaveBeenCalledWith(...args);
}

/**
 * Assert that an async function throws
 */
export async function expectAsyncThrow(fn: () => Promise<unknown>, errorMessage?: string | RegExp) {
  let error: Error | undefined;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();
  if (errorMessage) {
    if (typeof errorMessage === "string") {
      expect(error?.message).toContain(errorMessage);
    } else {
      expect(error?.message).toMatch(errorMessage);
    }
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export * from "@testing-library/react";
export { customRender as render };
