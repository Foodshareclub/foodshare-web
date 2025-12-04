/**
 * Supabase Client Configuration
 * Optimized for Next.js with proper SSR handling and session management
 * Following ultrathink principles: simple, secure, maintainable
 *
 * @module lib/auth/client
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Check if we're on the server
const isServer = typeof window === "undefined";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables - don't throw during build/SSR, just warn
const hasValidConfig = !!supabaseUrl && !!supabaseAnonKey;
if (!hasValidConfig && !isServer) {
  console.warn("Supabase Configuration Warning: Missing environment variables.", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
}

/**
 * Test browser storage health
 * Returns true if both localStorage and IndexedDB are available
 * Only runs on client side
 */
const testStorageHealth = (): boolean => {
  // Always return false on server
  if (isServer) return false;

  try {
    // Test localStorage
    const testKey = "__supabase_storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);

    // Test IndexedDB availability
    if (!("indexedDB" in window) || indexedDB === null) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Create safe storage wrapper with fallback to memory
 */
const createSafeStorage = () => {
  const fallbackStorage = new Map<string, string>();

  // On server, always use fallback
  if (isServer) {
    return {
      getItem: (key: string): string | null => fallbackStorage.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        fallbackStorage.set(key, value);
      },
      removeItem: (key: string): void => {
        fallbackStorage.delete(key);
      },
    };
  }

  const isStorageAvailable = testStorageHealth();

  return {
    getItem: (key: string): string | null => {
      try {
        return isStorageAvailable ? localStorage.getItem(key) : (fallbackStorage.get(key) ?? null);
      } catch {
        return fallbackStorage.get(key) ?? null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        if (isStorageAvailable) {
          localStorage.setItem(key, value);
        } else {
          fallbackStorage.set(key, value);
        }
      } catch {
        fallbackStorage.set(key, value);
      }
    },
    removeItem: (key: string): void => {
      try {
        if (isStorageAvailable) {
          localStorage.removeItem(key);
        } else {
          fallbackStorage.delete(key);
        }
      } catch {
        fallbackStorage.delete(key);
      }
    },
  };
};

// Only test storage health on client
const storageHealth = isServer ? false : testStorageHealth();

/**
 * Singleton Supabase client instance
 * Configured with optimized settings for Next.js
 *
 * Features:
 * - PKCE flow for enhanced OAuth security
 * - Auto token refresh (prevents session expiry)
 * - Safe storage with fallback to memory
 * - Session persistence across tabs
 * - Realtime rate limiting
 */
// Use placeholder values during build if env vars are missing
// The client won't work, but it won't crash the build either
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
  auth: {
    storage: createSafeStorage(),
    autoRefreshToken: true,
    persistSession: !isServer && storageHealth,
    detectSessionInUrl: !isServer,
    flowType: "pkce", // PKCE flow prevents authorization code interception
    debug: process.env.NODE_ENV !== 'production',
    // Storage key for multi-app support
    storageKey: "foodshare-auth",
  },
  global: {
    headers: {
      "x-application-name": "foodshare-web",
      "x-client-version": "2.0.0",
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit to prevent abuse
    },
  },
});

// Log initialization status in development only
if (process.env.NODE_ENV === 'development' && !isServer && hasValidConfig) {
  // Using console.info for non-error diagnostic info
  console.info(
    `[Supabase] Initialized ${storageHealth ? "with persistent sessions" : "in memory-only mode"}`
  );
}

export const isStorageHealthy = storageHealth;
