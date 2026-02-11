/**
 * Production Error Reporter
 * Batches and sends errors to external services with retry logic
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("ProductionErrorReporter");

interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  level: "error" | "warn" | "fatal";
  context?: Record<string, unknown>;
  userAgent: string;
  url: string;
  deployment: {
    env: string;
    version: string;
    commit?: string;
  };
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: string;
  category: "navigation" | "user" | "console" | "network" | "error";
  message: string;
  data?: Record<string, unknown>;
}

class ProductionErrorReporter {
  private errorQueue: ErrorReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private maxQueueSize = 20;
  private flushInterval = 30000; // 30 seconds
  private retryAttempts = 3;
  private retryDelay = 1000;
  private flushTimer?: number;

  constructor() {
    if (process.env.NODE_ENV === "production") {
      this.startAutoFlush();
      this.setupBeforeUnload();
    }
  }

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(category: Breadcrumb["category"], message: string, data?: Record<string, unknown>) {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(`Breadcrumb: ${category} - ${message}`, data);
    }
  }

  /**
   * Report error to queue
   */
  reportError(
    error: Error,
    level: ErrorReport["level"] = "error",
    context?: Record<string, unknown>
  ) {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      level,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      deployment: {
        env: process.env.NODE_ENV,
        version: "3.0.0",
        commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    this.errorQueue.push(report);

    // Add error breadcrumb
    this.addBreadcrumb("error", error.message, { level });

    logger.error(`Error queued for reporting: ${error.message}`, error, context);

    // Flush immediately if queue is full or error is fatal
    if (this.errorQueue.length >= this.maxQueueSize || level === "fatal") {
      this.flush();
    }
  }

  /**
   * Flush error queue
   */
  async flush() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    logger.info(`Flushing ${errors.length} errors to reporting service`);

    try {
      await this.sendToService(errors);
      logger.success(`Successfully reported ${errors.length} errors`);
    } catch (error) {
      logger.error("Failed to report errors", error as Error);

      // Re-queue errors for retry (up to max queue size)
      this.errorQueue.unshift(...errors.slice(0, this.maxQueueSize));
    }
  }

  /**
   * Send errors to external service with retry
   */
  private async sendToService(errors: ErrorReport[], attempt: number = 1): Promise<void> {
    // TODO: Replace with your actual error reporting service
    // Examples: Sentry, LogRocket, Rollbar, custom endpoint

    const endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT;

    if (!endpoint) {
      // Store locally if no endpoint configured
      this.storeLocally(errors);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        logger.warn(`Retry attempt ${attempt}/${this.retryAttempts}`);
        await this.delay(this.retryDelay * attempt);
        return this.sendToService(errors, attempt + 1);
      }

      // Store locally after all retries failed
      this.storeLocally(errors);
      throw error;
    }
  }

  /**
   * Store errors locally as fallback
   */
  private storeLocally(errors: ErrorReport[]) {
    try {
      const stored = JSON.parse(localStorage.getItem("error_reports") || "[]");
      stored.push(...errors);

      // Keep only last 50 errors
      const trimmed = stored.slice(-50);
      localStorage.setItem("error_reports", JSON.stringify(trimmed));

      logger.info(`Stored ${errors.length} errors locally`);
    } catch (error) {
      logger.warn("Failed to store errors locally", { error });
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush() {
    this.flushTimer = window.setInterval(() => {
      if (this.errorQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Setup beforeunload handler to flush on page exit
   */
  private setupBeforeUnload() {
    window.addEventListener("beforeunload", () => {
      if (this.errorQueue.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        const endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT;
        if (endpoint) {
          const blob = new Blob([JSON.stringify({ errors: this.errorQueue })], {
            type: "application/json",
          });
          navigator.sendBeacon(endpoint, blob);
        } else {
          this.storeLocally(this.errorQueue);
        }
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get stored errors
   */
  getStoredErrors(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem("error_reports") || "[]");
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    localStorage.removeItem("error_reports");
    logger.info("Cleared stored errors");
  }

  /**
   * Export errors as JSON
   */
  exportErrors(): string {
    const stored = this.getStoredErrors();
    const queued = this.errorQueue;
    return JSON.stringify({ stored, queued, breadcrumbs: this.breadcrumbs }, null, 2);
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stored = this.getStoredErrors();
    const queued = this.errorQueue;

    const stats = {
      total: stored.length + queued.length,
      stored: stored.length,
      queued: queued.length,
      byLevel: {
        error: [...stored, ...queued].filter((e) => e.level === "error").length,
        warn: [...stored, ...queued].filter((e) => e.level === "warn").length,
        fatal: [...stored, ...queued].filter((e) => e.level === "fatal").length,
      },
      breadcrumbs: this.breadcrumbs.length,
    };

    logger.info("Error statistics", stats);
    return stats;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton instance
export const productionErrorReporter = new ProductionErrorReporter();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__errorReporter = productionErrorReporter;
}

export default productionErrorReporter;
