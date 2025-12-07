/**
 * Supabase Client Configuration
 * Uses @supabase/ssr for proper cookie-based PKCE OAuth flow
 * Required for server-side callback to exchange auth codes
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Clear corrupted Supabase cookies before client initialization
 * This prevents "Invalid UTF-8 sequence" errors
 */
function clearCorruptedCookies(): void {
  if (typeof document === 'undefined') return;
  
  try {
    const cookies = document.cookie.split(';');
    const base64urlRegex = /^[A-Za-z0-9_-]*$/;
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name?.startsWith('sb-') && value) {
        try {
          // Check if cookie value has valid base64url characters
          const decodedValue = decodeURIComponent(value);
          const parts = decodedValue.split('.');
          const isValid = parts.every(
            (part) => base64urlRegex.test(part) || part === ''
          );
          
          if (!isValid) {
            // Delete corrupted cookie
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            console.warn(`Cleared corrupted Supabase cookie: ${name}`);
          }
        } catch {
          // If decoding fails, delete the cookie
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          console.warn(`Cleared invalid Supabase cookie: ${name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error clearing corrupted cookies:', error);
  }
}

// Clear corrupted cookies before creating the client
clearCorruptedCookies();

/**
 * Singleton Supabase client instance for browser
 * Uses @supabase/ssr createBrowserClient for:
 * - Cookie-based session storage (works with server-side routes)
 * - PKCE OAuth flow (code_verifier stored in cookies)
 * - Automatic token refresh
 */
export const supabase: SupabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      flowType: "pkce",
      debug: process.env.NODE_ENV === "development",
      // Note: Using default storageKey to match server-side cookie handling
    },
    global: {
      headers: {
        "x-application-name": "foodshare-web",
        "x-client-version": "2.0.0",
      },
    },
  }
);

// For backwards compatibility
export const createClient = () => supabase;

// Storage health check (always true with cookie-based SSR client)
// The SSR client handles storage gracefully
export const isStorageHealthy = true;
