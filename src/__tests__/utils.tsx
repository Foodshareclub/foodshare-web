/**
 * Test Utilities
 * Shared utilities for testing React components and hooks
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';

// ============================================================================
// Query Client Factory
// ============================================================================

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

// ============================================================================
// Test Providers Wrapper
// ============================================================================

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render Function
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, ...renderOptions } = options;

  const testQueryClient = queryClient || createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AllProviders queryClient={testQueryClient}>
        {children}
      </AllProviders>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}

// ============================================================================
// Mock Supabase Client Factory
// ============================================================================

export function createMockSupabaseClient() {
  const mockFrom = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  });

  return {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      }),
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    }),
  };
}

// ============================================================================
// Fast-Check Arbitraries for Domain Objects
// ============================================================================

// Coordinate arbitrary
export const coordinateArbitrary = fc.record({
  lat: fc.double({ min: -90, max: 90, noNaN: true }),
  lng: fc.double({ min: -180, max: 180, noNaN: true }),
});

// Product type arbitrary
export const productTypeArbitrary = fc.constantFrom(
  'food',
  'thing',
  'borrow',
  'wanted',
  'fridge',
  'foodbank',
  'business',
  'volunteer',
  'challenge',
  'zerowaste',
  'vegan',
  'forum'
);

// Product arbitrary
export const productArbitrary = fc.record({
  id: fc.integer({ min: 1 }),
  post_name: fc.string({ minLength: 1, maxLength: 100 }),
  post_type: productTypeArbitrary,
  post_description: fc.string({ maxLength: 500 }),
  post_address: fc.string({ maxLength: 200 }),
  post_stripped_address: fc.string({ maxLength: 100 }),
  images: fc.array(fc.webUrl(), { maxLength: 5 }),
  available_hours: fc.string({ maxLength: 50 }),
  transportation: fc.string({ maxLength: 50 }),
  is_active: fc.boolean(),
  is_arranged: fc.boolean(),
  post_views: fc.integer({ min: 0 }),
  post_like_counter: fc.integer({ min: 0 }),
  profile_id: fc.uuid(),
  created_at: fc.date().map(d => d.toISOString()),
});

// User arbitrary
export const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  full_name: fc.string({ minLength: 1, maxLength: 100 }),
  avatar_url: fc.option(fc.webUrl()),
});

// ============================================================================
// Re-export testing library utilities
// ============================================================================

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
