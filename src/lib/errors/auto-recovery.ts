/**
 * Automated Recovery System
 * Automatically attempts to recover from errors
 */

import { productionErrorReporter } from "./production-reporter";
import { createLogger } from "@/lib/logger";

// Extend Window interface for optional debug/recovery methods
declare global {
  interface Window {
    __clearCache?: () => void;
    __autoRecovery?: AutoRecovery;
    gc?: () => void;
  }
}

const logger = createLogger("AutoRecovery");

interface RecoveryStrategy {
  name: string;
  condition: (error: Error) => boolean;
  action: () => Promise<boolean>;
  maxAttempts: number;
}

interface RecoveryAttempt {
  strategy: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

class AutoRecovery {
  private strategies: RecoveryStrategy[] = [];
  private attempts: RecoveryAttempt[] = [];
  private maxAttemptsHistory = 50;
  private recoveryInProgress = false;

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies() {
    // Strategy 1: Clear cache and reload
    this.registerStrategy({
      name: "clear-cache-reload",
      condition: (error) =>
        error.message.includes("chunk") ||
        error.message.includes("module") ||
        error.message.includes("import"),
      action: async () => {
        logger.info("Attempting recovery: Clear cache and reload");
        try {
          // Clear caches
          if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
          }

          // Reload
          window.location.reload();
          return true;
        } catch (error) {
          logger.error("Cache clear failed", error as Error);
          return false;
        }
      },
      maxAttempts: 1,
    });

    // Strategy 2: Clear non-auth storage
    // IMPORTANT: Never clear localStorage.clear() as it destroys auth tokens
    // Instead, only clear non-essential cache keys
    this.registerStrategy({
      name: "clear-storage",
      condition: (error) =>
        error.message.includes("storage") ||
        error.message.includes("quota") ||
        error.message.includes("localStorage"),
      action: async () => {
        logger.info("Attempting recovery: Clear non-auth storage");
        try {
          // Auth key patterns that must be preserved
          const authPatterns = [
            "auth-token",
            "auth_token",
            "access_token",
            "refresh_token",
            "session",
            "pkce",
            "code_verifier",
            "sb-", // Supabase auth cookies use sb- prefix
          ];

          const isAuthKey = (key: string): boolean => {
            const lowerKey = key.toLowerCase();
            return authPatterns.some((pattern) => lowerKey.includes(pattern));
          };

          // Clear non-auth localStorage keys only
          const keysToRemove = Object.keys(localStorage).filter((key) => !isAuthKey(key));
          logger.info(`Clearing ${keysToRemove.length} non-auth localStorage keys`);
          keysToRemove.forEach((key) => localStorage.removeItem(key));

          // Clear sessionStorage (doesn't contain auth tokens, safe to clear)
          sessionStorage.clear();

          return true;
        } catch (error) {
          logger.error("Storage clear failed", error as Error);
          return false;
        }
      },
      maxAttempts: 1,
    });

    // Strategy 3: Reload without cache
    this.registerStrategy({
      name: "hard-reload",
      condition: (error) =>
        error.message.includes("network") ||
        error.message.includes("fetch") ||
        error.message.includes("load"),
      action: async () => {
        logger.info("Attempting recovery: Hard reload");
        window.location.reload();
        return true;
      },
      maxAttempts: 2,
    });

    // Strategy 4: Clear IndexedDB
    this.registerStrategy({
      name: "clear-indexeddb",
      condition: (error) =>
        error.message.includes("indexeddb") || error.message.includes("database"),
      action: async () => {
        logger.info("Attempting recovery: Clear IndexedDB");
        try {
          if ("indexedDB" in window) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            }
          }
          return true;
        } catch (error) {
          logger.error("IndexedDB clear failed", error as Error);
          return false;
        }
      },
      maxAttempts: 1,
    });

    // Strategy 5: Memory cleanup
    this.registerStrategy({
      name: "memory-cleanup",
      condition: (error) => error.message.includes("memory") || error.message.includes("heap"),
      action: async () => {
        logger.info("Attempting recovery: Memory cleanup");
        try {
          // Clear large objects
          if (window.__clearCache) {
            window.__clearCache();
          }

          // Force garbage collection (if available)
          if (window.gc) {
            window.gc();
          }

          return true;
        } catch (error) {
          logger.error("Memory cleanup failed", error as Error);
          return false;
        }
      },
      maxAttempts: 1,
    });
  }

  /**
   * Register a custom recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy) {
    this.strategies.push(strategy);
    logger.debug(`Registered recovery strategy: ${strategy.name}`);
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: Error): Promise<boolean> {
    if (this.recoveryInProgress) {
      logger.warn("Recovery already in progress");
      return false;
    }

    this.recoveryInProgress = true;
    logger.info("Starting automated recovery", { error: error.message });

    // Find matching strategies
    const matchingStrategies = this.strategies.filter((s) => s.condition(error));

    if (matchingStrategies.length === 0) {
      logger.warn("No recovery strategy found for error", { error: error.message });
      this.recoveryInProgress = false;
      return false;
    }

    // Try each strategy
    for (const strategy of matchingStrategies) {
      // Check if we've exceeded max attempts
      const previousAttempts = this.attempts.filter((a) => a.strategy === strategy.name).length;

      if (previousAttempts >= strategy.maxAttempts) {
        logger.warn(`Max attempts reached for strategy: ${strategy.name}`);
        continue;
      }

      try {
        logger.info(`Trying recovery strategy: ${strategy.name}`);
        const success = await strategy.action();

        // Record attempt
        this.recordAttempt(strategy.name, success);

        if (success) {
          logger.success(`Recovery successful: ${strategy.name}`);

          // Report success
          productionErrorReporter.addBreadcrumb(
            "error",
            `Auto-recovery successful: ${strategy.name}`,
            { error: error.message }
          );

          this.recoveryInProgress = false;
          return true;
        }
      } catch (strategyError) {
        logger.error(`Recovery strategy failed: ${strategy.name}`, strategyError as Error);
        this.recordAttempt(strategy.name, false, (strategyError as Error).message);
      }
    }

    logger.error("All recovery strategies failed");
    this.recoveryInProgress = false;
    return false;
  }

  /**
   * Record recovery attempt
   */
  private recordAttempt(strategy: string, success: boolean, error?: string) {
    const attempt: RecoveryAttempt = {
      strategy,
      timestamp: Date.now(),
      success,
      error,
    };

    this.attempts.push(attempt);

    // Keep only last N attempts
    if (this.attempts.length > this.maxAttemptsHistory) {
      this.attempts.shift();
    }
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(): RecoveryAttempt[] {
    return [...this.attempts];
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    const total = this.attempts.length;
    const successful = this.attempts.filter((a) => a.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    const byStrategy: Record<string, { total: number; successful: number }> = {};
    this.attempts.forEach((attempt) => {
      if (!byStrategy[attempt.strategy]) {
        byStrategy[attempt.strategy] = { total: 0, successful: 0 };
      }
      byStrategy[attempt.strategy].total++;
      if (attempt.success) {
        byStrategy[attempt.strategy].successful++;
      }
    });

    return {
      total,
      successful,
      failed,
      successRate,
      byStrategy,
    };
  }

  /**
   * Clear recovery history
   */
  clearHistory() {
    this.attempts = [];
    logger.info("Recovery history cleared");
  }

  /**
   * Test recovery system
   */
  async testRecovery() {
    logger.info("Testing recovery system...");

    const testErrors = [
      new Error("Loading chunk 123 failed"),
      new Error("QuotaExceededError: localStorage quota exceeded"),
      new Error("Failed to fetch module"),
    ];

    for (const error of testErrors) {
      logger.info(`Testing with error: ${error.message}`);
      const strategies = this.strategies.filter((s) => s.condition(error));
      logger.info(`Found ${strategies.length} matching strategies`);
      strategies.forEach((s) => logger.info(`  - ${s.name}`));
    }
  }
}

// Create singleton instance
export const autoRecovery = new AutoRecovery();

// Expose to window for debugging
if (typeof window !== "undefined") {
  window.__autoRecovery = autoRecovery;
}

export default autoRecovery;
