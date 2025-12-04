/**
 * Supabase Mock for Tests
 * Centralized mock that can be imported in test files
 */

import { jest } from '@jest/globals';

// Create a shared mock state that can be modified per-test
export const mockAuthState = {
  session: null as unknown,
  user: null as unknown,
  signInResult: { data: { user: null, session: null }, error: null as unknown },
  signUpResult: { data: { user: null, session: null }, error: null as unknown },
};

// Reset mock state to defaults
export function resetMockAuthState() {
  mockAuthState.session = null;
  mockAuthState.user = null;
  mockAuthState.signInResult = { data: { user: null, session: null }, error: null };
  mockAuthState.signUpResult = { data: { user: null, session: null }, error: null };
}

// Create mock Supabase client
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: mockAuthState.session },
          error: null,
        })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: mockAuthState.user },
          error: null,
        })
      ),
      signInWithPassword: jest.fn(() => Promise.resolve(mockAuthState.signInResult)),
      signUp: jest.fn(() => Promise.resolve(mockAuthState.signUpResult)),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      signInWithOtp: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      updateUser: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
    channel: jest.fn(() => {
      const channelMock = {
        on: jest.fn(() => channelMock),
        subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
        unsubscribe: jest.fn(() => Promise.resolve({ status: 'UNSUBSCRIBED' })),
      };
      return channelMock;
    }),
    removeChannel: jest.fn(),
  };
}

// Pre-created mock instance for use in tests
export const mockSupabase = createMockSupabaseClient();
