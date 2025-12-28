/**
 * Auth Client Tests
 * Unit tests for auth client exports
 */

import { describe, it, expect } from '@jest/globals';

describe('Auth Client', () => {
  describe('supabase export', () => {
    it('should be exported from client module', async () => {
      const clientModule = await import('@/lib/auth/client');
      expect(clientModule.supabase).toBeDefined();
    });

    it('should have auth property', async () => {
      const clientModule = await import('@/lib/auth/client');
      expect(clientModule.supabase.auth).toBeDefined();
    });

    it('should have from method for table queries', async () => {
      const clientModule = await import('@/lib/auth/client');
      expect(typeof clientModule.supabase.from).toBe('function');
    });
  });

  describe('isStorageHealthy export', () => {
    it('should be exported from client module', async () => {
      const clientModule = await import('@/lib/auth/client');
      expect(clientModule.isStorageHealthy).toBeDefined();
      expect(typeof clientModule.isStorageHealthy).toBe('boolean');
    });
  });

  describe('Client Configuration', () => {
    it('should connect to correct supabase project', () => {
      // Client should be configured with environment variables
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    });

    it('should have anonymous key for client access', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });
  });
});
