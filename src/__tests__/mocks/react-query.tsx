/**
 * React Query Test Utilities
 * Helpers for testing components that use TanStack Query
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a test-specific QueryClient with sensible defaults
 * - No retries (tests should fail fast)
 * - No garbage collection time (cleanup between tests)
 * - No caching by default
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
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
  });
}

/**
 * Create a wrapper component for testing hooks and components that use React Query
 *
 * @example
 * ```tsx
 * const { result } = renderHook(() => useMyQuery(), {
 *   wrapper: createQueryWrapper(),
 * });
 * ```
 */
export function createQueryWrapper() {
  const queryClient = createTestQueryClient();

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/**
 * Wrapper component with pre-configured QueryClient
 * Use for component tests that need React Query context
 *
 * @example
 * ```tsx
 * render(<MyComponent />, { wrapper: TestQueryProvider });
 * ```
 */
export function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
