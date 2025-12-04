/**
 * Circuit Breaker Pattern for Email Providers
 * Prevents cascading failures by temporarily disabling unhealthy providers
 */

import type { EmailProvider } from "./types";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms before attempting to close circuit
  halfOpenMaxAttempts: number; // Max attempts in half-open state
  monitoringWindow: number; // Time window in ms for counting failures
}

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
  consecutiveSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 60000, // Try again after 1 minute
  halfOpenMaxAttempts: 3, // Allow 3 test requests in half-open
  monitoringWindow: 300000, // 5 minute window for counting failures
};

export class CircuitBreaker {
  private circuits: Map<EmailProvider, CircuitStatus>;
  private config: CircuitBreakerConfig;
  private failureTimestamps: Map<EmailProvider, number[]>;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuits = new Map();
    this.failureTimestamps = new Map();

    // Initialize circuits for all providers
    const providers: EmailProvider[] = ["resend", "brevo", "aws_ses"];
    providers.forEach((provider) => {
      this.circuits.set(provider, {
        state: "closed",
        failures: 0,
        consecutiveSuccesses: 0,
      });
      this.failureTimestamps.set(provider, []);
    });
  }

  /**
   * Check if provider is available (circuit is closed or half-open)
   */
  isAvailable(provider: EmailProvider): boolean {
    const status = this.circuits.get(provider);
    if (!status) return true;

    // Clean old failures outside monitoring window
    this.cleanOldFailures(provider);

    switch (status.state) {
      case "closed":
        return true;

      case "open":
        // Check if timeout has passed
        if (status.nextRetryTime && Date.now() >= status.nextRetryTime) {
          // Transition to half-open
          this.circuits.set(provider, {
            ...status,
            state: "half-open",
            consecutiveSuccesses: 0,
          });
          return true;
        }
        return false;

      case "half-open":
        // Allow limited attempts in half-open state
        return status.consecutiveSuccesses < this.config.halfOpenMaxAttempts;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(provider: EmailProvider): void {
    const status = this.circuits.get(provider);
    if (!status) return;

    const updatedStatus = {
      ...status,
      consecutiveSuccesses: status.consecutiveSuccesses + 1,
      failures: 0,
    };

    // If in half-open and enough successes, close circuit
    if (
      status.state === "half-open" &&
      updatedStatus.consecutiveSuccesses >= this.config.halfOpenMaxAttempts
    ) {
      this.circuits.set(provider, {
        state: "closed",
        failures: 0,
        consecutiveSuccesses: 0,
      });
      this.failureTimestamps.set(provider, []);
    } else {
      this.circuits.set(provider, updatedStatus);
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(provider: EmailProvider, error?: Error): void {
    const status = this.circuits.get(provider);
    if (!status) return;

    const now = Date.now();
    const timestamps = this.failureTimestamps.get(provider) || [];

    // Add failure timestamp
    timestamps.push(now);
    this.failureTimestamps.set(provider, timestamps);

    // Clean old failures
    this.cleanOldFailures(provider);

    // Get current failure count within monitoring window
    const recentFailures = this.failureTimestamps.get(provider)?.length || 0;

    // Determine new state
    let newState: CircuitState = status.state;
    let nextRetryTime = status.nextRetryTime;

    if (status.state === "half-open") {
      // Failed in half-open, revert to open
      newState = "open";
      nextRetryTime = now + this.config.resetTimeout;
    } else if (recentFailures >= this.config.failureThreshold) {
      // Too many failures, open circuit
      newState = "open";
      nextRetryTime = now + this.config.resetTimeout;
    }

    this.circuits.set(provider, {
      state: newState,
      failures: recentFailures,
      lastFailureTime: now,
      nextRetryTime,
      consecutiveSuccesses: 0,
    });
  }

  /**
   * Get current status for a provider
   */
  getStatus(provider: EmailProvider): CircuitStatus | null {
    const status = this.circuits.get(provider);
    if (!status) return null;

    this.cleanOldFailures(provider);
    const recentFailures = this.failureTimestamps.get(provider)?.length || 0;

    return {
      ...status,
      failures: recentFailures,
    };
  }

  /**
   * Get status for all providers
   */
  getAllStatus(): Map<EmailProvider, CircuitStatus> {
    const statuses = new Map<EmailProvider, CircuitStatus>();

    for (const [provider, status] of this.circuits.entries()) {
      this.cleanOldFailures(provider);
      const recentFailures = this.failureTimestamps.get(provider)?.length || 0;

      statuses.set(provider, {
        ...status,
        failures: recentFailures,
      });
    }

    return statuses;
  }

  /**
   * Manually reset a provider's circuit (admin override)
   */
  reset(provider: EmailProvider): void {
    this.circuits.set(provider, {
      state: "closed",
      failures: 0,
      consecutiveSuccesses: 0,
    });
    this.failureTimestamps.set(provider, []);
  }

  /**
   * Manually open a provider's circuit (admin override)
   */
  disable(provider: EmailProvider, duration: number = this.config.resetTimeout): void {
    const now = Date.now();
    this.circuits.set(provider, {
      state: "open",
      failures: this.config.failureThreshold,
      lastFailureTime: now,
      nextRetryTime: now + duration,
      consecutiveSuccesses: 0,
    });
  }

  /**
   * Clean failures outside monitoring window
   */
  private cleanOldFailures(provider: EmailProvider): void {
    const timestamps = this.failureTimestamps.get(provider) || [];
    const cutoff = Date.now() - this.config.monitoringWindow;

    const recent = timestamps.filter((t) => t > cutoff);
    this.failureTimestamps.set(provider, recent);
  }

  /**
   * Get health metrics for monitoring
   */
  getHealthMetrics() {
    const metrics: Record<
      EmailProvider,
      {
        state: CircuitState;
        recentFailures: number;
        isHealthy: boolean;
        nextRetryIn?: number;
      }
    > = {} as any;

    for (const [provider, status] of this.circuits.entries()) {
      this.cleanOldFailures(provider);
      const recentFailures = this.failureTimestamps.get(provider)?.length || 0;
      const now = Date.now();

      metrics[provider] = {
        state: status.state,
        recentFailures,
        isHealthy: status.state === "closed",
        nextRetryIn: status.nextRetryTime ? Math.max(0, status.nextRetryTime - now) : undefined,
      };
    }

    return metrics;
  }
}

// Singleton instance
export const emailCircuitBreaker = new CircuitBreaker();
