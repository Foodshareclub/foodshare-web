/**
 * Circuit Breaker Tests
 *
 * Demonstrates testing the circuit breaker with enterprise test utilities.
 */

import {
  createTestCircuitBreaker,
  createFailingThenSucceedingFn,
} from "../enterprise-test-utils";
import { CircuitOpenError } from "../../api/circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("state transitions", () => {
    it("should start in CLOSED state", () => {
      const breaker = createTestCircuitBreaker();
      const metrics = breaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it("should transition to OPEN after failure threshold", async () => {
      const breaker = createTestCircuitBreaker({ failureThreshold: 2 });
      const failingFn = () => Promise.reject(new Error("fail"));

      // First failure
      await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
      expect(breaker.getMetrics().state).toBe("CLOSED");

      // Second failure - should open circuit
      await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
      expect(breaker.getMetrics().state).toBe("OPEN");
    });

    it("should reject immediately when OPEN", async () => {
      const breaker = createTestCircuitBreaker({ failureThreshold: 1 });

      // Open the circuit
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow("fail");

      // Should reject with CircuitOpenError
      await expect(
        breaker.execute(() => Promise.resolve("success"))
      ).rejects.toThrow(CircuitOpenError);
    });

    it("should transition to HALF_OPEN after reset timeout", async () => {
      const breaker = createTestCircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 100,
      });

      // Open the circuit
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();

      expect(breaker.getMetrics().state).toBe("OPEN");

      // Advance time past reset timeout
      jest.advanceTimersByTime(150);

      // Next call should be allowed (HALF_OPEN)
      const result = await breaker.execute(() => Promise.resolve("success"));
      expect(result).toBe("success");
      expect(breaker.getMetrics().state).toBe("CLOSED");
    });
  });

  describe("recovery", () => {
    it("should close circuit after successful call in HALF_OPEN", async () => {
      const breaker = createTestCircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 100,
        halfOpenRequests: 1,
      });

      // Open circuit
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();

      // Wait for HALF_OPEN
      jest.advanceTimersByTime(150);

      // Successful call should close circuit
      await breaker.execute(() => Promise.resolve("success"));

      expect(breaker.getMetrics().state).toBe("CLOSED");
      expect(breaker.getMetrics().consecutiveFailures).toBe(0);
    });

    it("should reopen circuit on failure in HALF_OPEN", async () => {
      const breaker = createTestCircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 100,
      });

      // Open circuit
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();

      // Wait for HALF_OPEN
      jest.advanceTimersByTime(150);

      // Failure should reopen circuit
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail again")))
      ).rejects.toThrow();

      expect(breaker.getMetrics().state).toBe("OPEN");
    });
  });

  describe("with retry pattern", () => {
    it("should work with failing-then-succeeding function", async () => {
      const breaker = createTestCircuitBreaker({ failureThreshold: 5 });
      const fn = createFailingThenSucceedingFn(2, "success");

      // First two calls fail
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      // Third call succeeds
      const result = await breaker.execute(fn);
      expect(result).toBe("success");

      // Circuit should still be closed (under threshold)
      expect(breaker.getMetrics().state).toBe("CLOSED");
    });
  });

  describe("metrics", () => {
    it("should track success and failure counts", async () => {
      const breaker = createTestCircuitBreaker({ failureThreshold: 10 });

      // 3 successes
      await breaker.execute(() => Promise.resolve(1));
      await breaker.execute(() => Promise.resolve(2));
      await breaker.execute(() => Promise.resolve(3));

      // 2 failures
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
      await expect(
        breaker.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.totalSuccesses).toBe(3);
      expect(metrics.totalFailures).toBe(2);
      expect(metrics.totalRequests).toBe(5);
    });
  });
});
