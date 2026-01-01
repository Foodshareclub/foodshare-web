/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is unavailable.
 * State transitions: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * SYNC: Mirrors Android CircuitBreaker.kt and backend circuit-breaker patterns
 *
 * @module lib/api/circuit-breaker
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** Name for logging/monitoring */
  name: string;
  /** Consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time to wait before attempting recovery in ms (default: 30000) */
  resetTimeoutMs?: number;
  /** Number of test requests in half-open state (default: 3) */
  halfOpenRequests?: number;
  /** Callback when state changes */
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  consecutiveFailures: number;
  failureRate: number;
  lastFailureTime: number | null;
}

/**
 * Circuit Breaker for fault tolerance
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({ name: 'products-api' });
 *
 * const result = await breaker.execute(async () => {
 *   return fetch('/api/products');
 * });
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private halfOpenSuccesses = 0;
  private halfOpenAttempts = 0;
  private lastFailureTime: number | null = null;

  // Metrics
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenRequests: number;
  private readonly onStateChange?: (
    name: string,
    from: CircuitState,
    to: CircuitState
  ) => void;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeoutMs = config.resetTimeoutMs ?? 30000;
    this.halfOpenRequests = config.halfOpenRequests ?? 3;
    this.onStateChange = config.onStateChange;
  }

  /**
   * Get current circuit state
   */
  get currentState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const total = this.totalRequests;
    return {
      state: this.state,
      totalRequests: total,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      consecutiveFailures: this.consecutiveFailures,
      failureRate: total > 0 ? this.totalFailures / total : 0,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Check if a request can proceed
   */
  canProceed(): boolean {
    this.totalRequests++;

    switch (this.state) {
      case "CLOSED":
        return true;

      case "OPEN": {
        const timeSinceFailure = this.lastFailureTime
          ? Date.now() - this.lastFailureTime
          : Infinity;

        if (timeSinceFailure >= this.resetTimeoutMs) {
          // Transition to half-open
          this.transitionTo("HALF_OPEN");
          this.halfOpenAttempts = 0;
          this.halfOpenSuccesses = 0;
          return true;
        }
        // Still in cooldown
        return false;
      }

      case "HALF_OPEN":
        // Allow limited requests in half-open state
        return ++this.halfOpenAttempts <= this.halfOpenRequests;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.totalSuccesses++;

    switch (this.state) {
      case "CLOSED":
        // Reset consecutive failures
        this.consecutiveFailures = 0;
        break;

      case "HALF_OPEN":
        if (++this.halfOpenSuccesses >= this.halfOpenRequests) {
          // Recovery successful - close circuit
          this.transitionTo("CLOSED");
          this.consecutiveFailures = 0;
        }
        break;

      case "OPEN":
        // Shouldn't happen, but handle gracefully
        break;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    switch (this.state) {
      case "CLOSED":
        if (++this.consecutiveFailures >= this.failureThreshold) {
          // Too many failures - open circuit
          this.transitionTo("OPEN");
        }
        break;

      case "HALF_OPEN":
        // Recovery failed - back to open
        this.transitionTo("OPEN");
        break;

      case "OPEN":
        // Already open, update failure time
        break;
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canProceed()) {
      throw new CircuitOpenError(this.name, this.remainingCooldownMs());
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  remainingCooldownMs(): number {
    if (this.state !== "OPEN" || !this.lastFailureTime) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(newState: CircuitState): void {
    this.transitionTo(newState);
    if (newState === "CLOSED") {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.onStateChange?.(this.name, oldState, newState);
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitOpenError extends Error {
  readonly code = "CIRCUIT_OPEN";
  readonly retryable = true;

  constructor(
    public readonly circuitName: string,
    public readonly remainingCooldownMs: number
  ) {
    super(
      `Circuit '${circuitName}' is open. Retry in ${remainingCooldownMs}ms`
    );
    this.name = "CircuitOpenError";
  }
}

// =============================================================================
// Circuit Breaker Registry
// =============================================================================

const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  const existing = breakers.get(config.name);
  if (existing) return existing;

  const breaker = new CircuitBreaker(config);
  breakers.set(config.name, breaker);
  return breaker;
}

/**
 * Get all circuit breaker metrics
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  const metrics: Record<string, CircuitBreakerMetrics> = {};
  for (const [name, breaker] of breakers) {
    metrics[name] = breaker.getMetrics();
  }
  return metrics;
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of breakers.values()) {
    breaker.reset();
  }
}

// Expose in development for debugging
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).circuitBreakerMetrics =
    getAllCircuitBreakerMetrics;
}
