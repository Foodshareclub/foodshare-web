/**
 * Session Management
 * Centralized session utilities with helper functions
 * Following ultrathink principles: simple, reliable, maintainable
 */

import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

// Re-export session manager
export { sessionManager, initializeSessionManagement } from "../supabase/session";

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[Session] Get session error:", error);
      return null;
    }

    return data.session;
  } catch (e) {
    console.error("[Session] Get session exception:", e);
    return null;
  }
}

/**
 * Refresh current session
 */
export async function refreshSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("[Session] Refresh error:", error);
      return null;
    }

    return data.session;
  } catch (e) {
    console.error("[Session] Refresh exception:", e);
    return null;
  }
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Session] Clear error:", error);
    }
  } catch (e) {
    console.error("[Session] Clear exception:", e);
  }
}
