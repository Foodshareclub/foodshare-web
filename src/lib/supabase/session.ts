/**
 * Session Management Utilities
 * Enhanced session handling with auto-refresh and cross-tab sync
 * Following ultrathink principles: reliable, observable, maintainable
 */

import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";

const logger = createLogger("SessionManager");

const SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

/**
 * Allowed paths for returnUrl redirect (security: prevents open redirect)
 * Only internal app paths are allowed to prevent phishing attacks
 */
const ALLOWED_RETURN_PATH_PREFIXES = [
  '/food',
  '/profile',
  '/settings',
  '/chat',
  '/forum',
  '/my-posts',
  '/challenge',
  '/admin',
  '/messages',
  '/notifications',
  '/map',
  '/thing',
  '/fridge',
  '/foodbank',
  '/donation',
  '/help',
] as const;

/**
 * Validate and sanitize returnUrl to prevent open redirect attacks
 * Returns sanitized path or fallback to home
 */
function getSafeReturnUrl(pathname: string): string {
  // Must start with / (relative path only)
  if (!pathname.startsWith('/')) {
    return '/';
  }

  // Check against allowed prefixes
  const isAllowed = ALLOWED_RETURN_PATH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Also allow exact match for home
  if (pathname === '/' || isAllowed) {
    return encodeURIComponent(pathname);
  }

  // Default to home for any unrecognized paths
  return '/';
}

let refreshTimer: NodeJS.Timeout | null = null;
let checkTimer: NodeJS.Timeout | null = null;

/**
 * Session Manager
 * Handles automatic token refresh and session monitoring
 */
export const sessionManager = {
  /**
   * Setup automatic session refresh
   * Refreshes token 5 minutes before expiry
   */
  setupAutoRefresh(session: Session | null) {
    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    if (!session) return;

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const expiresInMs = expiresAt * 1000 - Date.now();
    const refreshInMs = Math.max(0, expiresInMs - SESSION_REFRESH_THRESHOLD);

    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Session refresh scheduled`, { minutes: Math.round(refreshInMs / 1000 / 60) });
    }

    refreshTimer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          logger.error("Session refresh failed", error);
          return;
        }

        if (data.session) {
          if (process.env.NODE_ENV !== 'production') {
            logger.debug("Session refreshed successfully");
          }
          // Setup next refresh
          sessionManager.setupAutoRefresh(data.session);
        }
      } catch (e) {
        logger.error("Session refresh exception", e as Error);
      }
    }, refreshInMs);
  },

  /**
   * Start periodic session health checks
   * Verifies session is still valid every minute
   */
  startHealthCheck() {
    if (checkTimer) return; // Already running

    checkTimer = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          logger.warn("Session health check failed", { error });
          return;
        }

        if (!data.session) {
          // Session lost - could be expired or logged out in another tab
          if (process.env.NODE_ENV !== 'production') {
            logger.debug("Session lost - user may need to re-authenticate");
          }
          sessionManager.stopHealthCheck();
        }
      } catch (e) {
        logger.error("Session health check exception", e as Error);
      }
    }, SESSION_CHECK_INTERVAL);
  },

  /**
   * Stop health check timer
   */
  stopHealthCheck() {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  },

  /**
   * Sync session across browser tabs
   * Uses BroadcastChannel API for cross-tab communication
   */
  syncAcrossTabs() {
    if (typeof BroadcastChannel === "undefined") {
      // BroadcastChannel not supported
      return;
    }

    const channel = new BroadcastChannel("foodshare-auth");

    // Listen for auth events from other tabs
    channel.addEventListener("message", (event) => {
      const { type, session } = event.data;

      switch (type) {
        case "SIGNED_IN":
          if (process.env.NODE_ENV !== 'production') {
            logger.debug("User signed in from another tab");
          }
          // Refresh current tab's session
          window.location.reload();
          break;

        case "SIGNED_OUT":
          if (process.env.NODE_ENV !== 'production') {
            logger.debug("User signed out from another tab");
          }
          // Clear session and redirect
          window.location.href = "/";
          break;

        case "SESSION_REFRESHED":
          // Session was refreshed in another tab
          sessionManager.setupAutoRefresh(session);
          break;
      }
    });

    // Broadcast auth events to other tabs
    supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_IN":
          channel.postMessage({ type: "SIGNED_IN", session });
          break;

        case "SIGNED_OUT":
          channel.postMessage({ type: "SIGNED_OUT" });
          break;

        case "TOKEN_REFRESHED":
          channel.postMessage({ type: "SESSION_REFRESHED", session });
          break;
      }
    });

    return () => {
      channel.close();
    };
  },

  /**
   * Handle session timeout
   * Shows user-friendly message and redirects to login
   */
  handleTimeout() {
    // Clear all timers
    if (refreshTimer) clearTimeout(refreshTimer);
    if (checkTimer) clearInterval(checkTimer);

    // Show timeout message
    if (process.env.NODE_ENV !== 'production') {
      logger.debug("Session timed out");
    }

    // Redirect to login with validated return URL (prevents open redirect)
    const safeReturnUrl = getSafeReturnUrl(window.location.pathname);
    window.location.href = `/auth/login?returnUrl=${safeReturnUrl}&reason=timeout`;
  },

  /**
   * Cleanup all timers and listeners
   */
  cleanup() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  },
};

/**
 * Initialize session management
 * Call this once on app startup
 */
export async function initializeSessionManagement() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logger.error("Failed to initialize session", error);
      return;
    }

    if (data.session) {
      // Setup auto-refresh
      sessionManager.setupAutoRefresh(data.session);

      // Start health checks
      sessionManager.startHealthCheck();

      // Sync across tabs
      sessionManager.syncAcrossTabs();

      if (process.env.NODE_ENV !== 'production') {
        logger.debug("Session management initialized");
      }
    }
  } catch (e) {
    logger.error("Session initialization exception", e as Error);
  }
}
