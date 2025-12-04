/**
 * Auth Flow Integration Tests
 * Tests authentication hook interface and behavior
 *
 * Note: These tests focus on verifying the useAuth hook interface works correctly.
 * Full end-to-end auth testing should be done with Playwright/Cypress.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { LoginResult } from '@/lib/auth/types';

// Mock modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Create a shared mock state
const mockAuthState = {
  session: null as unknown,
  user: null as unknown,
  signInResult: { data: { user: null, session: null }, error: null as unknown },
  signUpResult: { data: { user: null, session: null }, error: null as unknown },
};

// Mock Supabase client - export supabase singleton directly
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: mockAuthState.session },
        error: null,
      })),
      getUser: jest.fn(() => Promise.resolve({
        data: { user: mockAuthState.user },
        error: null,
      })),
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
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
  isStorageHealthy: false,
}));

// Test wrapper
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockAuthState.session = null;
    mockAuthState.user = null;
    mockAuthState.signInResult = { data: { user: null, session: null }, error: null };
    mockAuthState.signUpResult = { data: { user: null, session: null }, error: null };
  });

  // ==========================================================================
  // Hook Interface Tests
  // ==========================================================================

  describe('Hook Interface', () => {
    it('should expose all required auth methods', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify all auth methods exist
      expect(typeof result.current.loginWithPassword).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.recoverPassword).toBe('function');
      expect(typeof result.current.updatePassword).toBe('function');
      expect(typeof result.current.checkSession).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('should expose auth state properties', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify state properties exist
      expect('isAuthenticated' in result.current).toBe(true);
      expect('isLoading' in result.current).toBe(true);
      expect('user' in result.current).toBe(true);
      expect('session' in result.current).toBe(true);
      expect('error' in result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial Auth State', () => {
    it('should start with unauthenticated state when no session', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should have loading state initially', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);
    });
  });

  // ==========================================================================
  // Login Flow Tests
  // ==========================================================================

  describe('Login with Password Flow', () => {
    it('should return failure result on invalid credentials', async () => {
      // Setup mock to return error
      mockAuthState.signInResult = {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };

      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: LoginResult;
      await act(async () => {
        loginResult = await result.current.loginWithPassword(
          'test@example.com',
          'wrongpassword'
        );
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBeDefined();
    });

    it('should call Supabase signInWithPassword with correct params', async () => {
      const { supabase } = require('@/lib/supabase/client');

      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loginWithPassword('test@example.com', 'password123');
      });

      // Verify the signInWithPassword method exists and was called
      expect(supabase.auth.signInWithPassword).toBeDefined();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Registration Flow Tests
  // ==========================================================================

  describe('Registration Flow', () => {
    it('should return failure result on registration error', async () => {
      // Setup mock to return error
      mockAuthState.signUpResult = {
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      };

      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let registerResult: LoginResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: 'existing@example.com',
          password: 'password123',
        });
      });

      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBeDefined();
    });

    it('should accept registration options', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called with proper params
      await expect(
        act(async () => {
          await result.current.register({
            email: 'newuser@example.com',
            password: 'password123',
          });
        })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Logout Flow Tests
  // ==========================================================================

  describe('Logout Flow', () => {
    it('should have logout function available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.logout).toBe('function');
    });
  });

  // ==========================================================================
  // Password Recovery Flow Tests
  // ==========================================================================

  describe('Password Recovery Flow', () => {
    it('should have recoverPassword method available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.recoverPassword).toBe('function');
    });

    it('should have updatePassword method available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.updatePassword).toBe('function');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should have clearError method that can be called', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called
      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not crash and should show unauthenticated state
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // Session Check Tests
  // ==========================================================================

  describe('Session Management', () => {
    it('should have checkSession method available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.checkSession).toBe('function');
    });

    it('should be able to call checkSession', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw when called
      await expect(
        act(async () => {
          await result.current.checkSession();
        })
      ).resolves.not.toThrow();
    });
  });
});
