/**
 * Token Manager
 *
 * Proactive token refresh and secure token handling:
 * - Refreshes tokens before expiry
 * - Handles refresh token rotation
 * - Secure token storage
 * - Token event notifications
 *
 * @module lib/security/token-manager
 */

import { supabase } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

export interface TokenInfo {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiry timestamp (ms) */
  expiresAt: number;
  /** Time until expiry (ms) */
  expiresIn: number;
  /** Whether token is expired */
  isExpired: boolean;
  /** Whether token needs refresh */
  needsRefresh: boolean;
}

export interface TokenManagerConfig {
  /** Refresh threshold in ms (default: 5 minutes before expiry) */
  refreshThresholdMs?: number;
  /** Check interval in ms (default: 60 seconds) */
  checkIntervalMs?: number;
  /** Enable automatic refresh (default: true) */
  autoRefresh?: boolean;
  /** Callback when token is refreshed */
  onTokenRefresh?: (session: Session) => void;
  /** Callback when refresh fails */
  onRefreshError?: (error: Error) => void;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

export type TokenEventType = "refresh" | "expire" | "error";

export interface TokenEvent {
  type: TokenEventType;
  timestamp: number;
  session?: Session;
  error?: Error;
}

// =============================================================================
// Token Manager
// =============================================================================

const DEFAULT_CONFIG: Required<TokenManagerConfig> = {
  refreshThresholdMs: 5 * 60 * 1000, // 5 minutes
  checkIntervalMs: 60 * 1000, // 1 minute
  autoRefresh: true,
  onTokenRefresh: () => {},
  onRefreshError: () => {},
  onSessionExpired: () => {},
};

/**
 * Token Manager for proactive token refresh
 *
 * @example
 * ```ts
 * const tokenManager = TokenManager.getInstance();
 *
 * // Get current token
 * const token = await tokenManager.getAccessToken();
 *
 * // Listen for token events
 * tokenManager.onTokenEvent((event) => {
 *   if (event.type === 'expire') {
 *     redirectToLogin();
 *   }
 * });
 *
 * // Start automatic refresh
 * tokenManager.start();
 * ```
 */
export class TokenManager {
  private static instance: TokenManager | null = null;

  private config: Required<TokenManagerConfig>;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private eventListeners: ((event: TokenEvent) => void)[] = [];
  private lastRefreshAttempt = 0;
  private refreshCooldownMs = 10000; // 10 seconds between refresh attempts

  private constructor(config: TokenManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: TokenManagerConfig): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(config);
    }
    return TokenManager.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (TokenManager.instance) {
      TokenManager.instance.stop();
      TokenManager.instance = null;
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Get token info
   */
  async getTokenInfo(): Promise<TokenInfo | null> {
    const session = await this.getSession();
    if (!session) return null;

    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const expiresIn = expiresAt - now;

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt,
      expiresIn,
      isExpired: expiresIn <= 0,
      needsRefresh: expiresIn <= this.config.refreshThresholdMs,
    };
  }

  /**
   * Refresh token if needed
   */
  async refreshIfNeeded(): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();

    if (!tokenInfo) {
      this.emitEvent({ type: "expire", timestamp: Date.now() });
      this.config.onSessionExpired();
      return false;
    }

    if (!tokenInfo.needsRefresh) {
      return true;
    }

    return this.refresh();
  }

  /**
   * Force token refresh
   */
  async refresh(): Promise<boolean> {
    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      return false;
    }

    // Cooldown between refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldownMs) {
      return false;
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = now;

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("No session returned from refresh");
      }

      this.emitEvent({
        type: "refresh",
        timestamp: Date.now(),
        session: data.session,
      });

      this.config.onTokenRefresh(data.session);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.emitEvent({
        type: "error",
        timestamp: Date.now(),
        error: err,
      });

      this.config.onRefreshError(err);

      // Check if session is completely expired
      const session = await this.getSession();
      if (!session) {
        this.emitEvent({ type: "expire", timestamp: Date.now() });
        this.config.onSessionExpired();
      }

      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Start automatic token refresh
   */
  start(): void {
    if (this.checkInterval) return;

    // Initial check
    this.refreshIfNeeded();

    // Periodic check
    this.checkInterval = setInterval(() => {
      if (this.config.autoRefresh) {
        this.refreshIfNeeded();
      }
    }, this.config.checkIntervalMs);

    // Listen for Supabase auth events
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        this.emitEvent({
          type: "refresh",
          timestamp: Date.now(),
          session,
        });
      } else if (event === "SIGNED_OUT") {
        this.emitEvent({ type: "expire", timestamp: Date.now() });
      }
    });
  }

  /**
   * Stop automatic token refresh
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Subscribe to token events
   */
  onTokenEvent(callback: (event: TokenEvent) => void): () => void {
    this.eventListeners.push(callback);

    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit token event
   */
  private emitEvent(event: TokenEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[TokenManager] Event listener error:", error);
      }
    }
  }

  /**
   * Clear all tokens (logout)
   */
  async clearTokens(): Promise<void> {
    await supabase.auth.signOut();
    this.emitEvent({ type: "expire", timestamp: Date.now() });
  }

  /**
   * Get authorization header
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the token manager instance
 */
export function getTokenManager(config?: TokenManagerConfig): TokenManager {
  return TokenManager.getInstance(config);
}

/**
 * Get current access token
 */
export async function getAccessToken(): Promise<string | null> {
  return getTokenManager().getAccessToken();
}

/**
 * Get authorization header
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  return getTokenManager().getAuthHeader();
}

/**
 * Refresh token if needed
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  return getTokenManager().refreshIfNeeded();
}

/**
 * Start token manager
 */
export function startTokenManager(config?: TokenManagerConfig): void {
  getTokenManager(config).start();
}

/**
 * Stop token manager
 */
export function stopTokenManager(): void {
  getTokenManager().stop();
}
