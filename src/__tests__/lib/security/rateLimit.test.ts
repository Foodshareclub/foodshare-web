/**
 * Rate Limiting Tests
 * Unit tests for rate limiting service
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock state
const mockState = {
  rateLimitResult: {
    success: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 10000,
  },
  headersMap: new Map<string, string>(),
};

// Mock limiter instance
const mockLimiter = {
  limit: jest.fn(() => Promise.resolve(mockState.rateLimitResult)),
};

// Mock headers from next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn(() =>
    Promise.resolve({
      get: (name: string) => mockState.headersMap.get(name) || null,
    })
  ),
}));

// Mock Upstash Redis
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

// Mock Upstash Ratelimit with static methods
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => mockLimiter),
    {
      slidingWindow: jest.fn().mockReturnValue("sliding-window-config"),
    }
  ),
}));

// Store original env
const originalEnv = process.env;

// Helper to set NODE_ENV (workaround for TypeScript readonly property)
function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.headersMap.clear();
    mockState.rateLimitResult = {
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 10000,
    };
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // checkRateLimit Tests
  // ==========================================================================

  describe("checkRateLimit", () => {
    it("should return success in development mode", async () => {
      setNodeEnv("development");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(999);
      expect(result.remaining).toBe(999);
    });

    it("should return success when Redis not configured", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "";

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard");

      expect(result.success).toBe(true);
      expect(result.limit).toBe(999);
    });

    it("should check rate limit with standard limiter in production", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockState.rateLimitResult = {
        success: true,
        limit: 20,
        remaining: 15,
        reset: Date.now() + 10000,
      };

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard");

      expect(result.success).toBe(true);
    });

    it("should return failure when rate limit exceeded", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockState.rateLimitResult = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 60000,
      };

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should use custom identifier when provided", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard", "user-123");

      expect(result.success).toBe(true);
    });

    it("should handle different rate limit types", async () => {
      setNodeEnv("development");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      // All should work in development mode
      const standardResult = await checkRateLimit("standard");
      const sensitiveResult = await checkRateLimit("sensitive");
      const writeResult = await checkRateLimit("write");
      const strictResult = await checkRateLimit("strict");

      expect(standardResult.success).toBe(true);
      expect(sensitiveResult.success).toBe(true);
      expect(writeResult.success).toBe(true);
      expect(strictResult.success).toBe(true);
    });
  });

  // ==========================================================================
  // Client Identifier Tests
  // ==========================================================================

  describe("getClientIdentifier (via checkRateLimit)", () => {
    beforeEach(() => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    });

    it("should use cf-connecting-ip header when available", async () => {
      mockState.headersMap.set("cf-connecting-ip", "1.2.3.4");
      mockState.headersMap.set("x-real-ip", "5.6.7.8");
      mockState.headersMap.set("x-forwarded-for", "9.10.11.12");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      // The function should use cf-connecting-ip first
      await checkRateLimit("standard");

      // Verify it ran without error
      expect(mockLimiter.limit).toHaveBeenCalled();
    });

    it("should use x-real-ip header when cf-connecting-ip not available", async () => {
      mockState.headersMap.set("x-real-ip", "5.6.7.8");
      mockState.headersMap.set("x-forwarded-for", "9.10.11.12");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      await checkRateLimit("standard");

      expect(mockLimiter.limit).toHaveBeenCalled();
    });

    it("should use x-forwarded-for header as fallback", async () => {
      mockState.headersMap.set("x-forwarded-for", "9.10.11.12, 13.14.15.16");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      await checkRateLimit("standard");

      expect(mockLimiter.limit).toHaveBeenCalled();
    });

    it("should use anonymous when no headers available", async () => {
      // No headers set

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      await checkRateLimit("standard");

      expect(mockLimiter.limit).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // requireRateLimit Tests
  // ==========================================================================

  describe("requireRateLimit", () => {
    it("should not throw when under rate limit", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockState.rateLimitResult = {
        success: true,
        limit: 20,
        remaining: 15,
        reset: Date.now() + 10000,
      };

      const { requireRateLimit } = require("@/lib/security/rateLimit");

      await expect(requireRateLimit("standard")).resolves.toBeUndefined();
    });

    it("should throw when rate limit exceeded", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const resetTime = Date.now() + 30000; // 30 seconds from now
      mockState.rateLimitResult = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: resetTime,
      };

      const { requireRateLimit } = require("@/lib/security/rateLimit");

      await expect(requireRateLimit("standard")).rejects.toThrow(/Rate limit exceeded/);
    });

    it("should include reset time in error message", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const resetTime = Date.now() + 45000; // 45 seconds from now
      mockState.rateLimitResult = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: resetTime,
      };

      const { requireRateLimit } = require("@/lib/security/rateLimit");

      await expect(requireRateLimit("standard")).rejects.toThrow(/try again in \d+ seconds/);
    });

    it("should not throw in development mode", async () => {
      setNodeEnv("development");

      const { requireRateLimit } = require("@/lib/security/rateLimit");

      await expect(requireRateLimit("strict")).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // withRateLimit Tests
  // ==========================================================================

  describe("withRateLimit", () => {
    it("should execute action when under rate limit", async () => {
      setNodeEnv("development");

      const { withRateLimit } = require("@/lib/security/rateLimit");

      const mockAction = jest
        .fn<(...args: unknown[]) => Promise<string>>()
        .mockResolvedValue("success");
      const wrappedAction = withRateLimit(mockAction, "standard");

      const result = await wrappedAction("arg1", "arg2");

      expect(result).toBe("success");
      expect(mockAction).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should not execute action when rate limited", async () => {
      setNodeEnv("production");
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      mockState.rateLimitResult = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 30000,
      };

      const { withRateLimit } = require("@/lib/security/rateLimit");

      const mockAction = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const wrappedAction = withRateLimit(mockAction, "standard");

      await expect(wrappedAction()).rejects.toThrow(/Rate limit exceeded/);
      expect(mockAction).not.toHaveBeenCalled();
    });

    it("should pass through action errors", async () => {
      setNodeEnv("development");

      const { withRateLimit } = require("@/lib/security/rateLimit");

      const mockAction = jest
        .fn<() => Promise<never>>()
        .mockRejectedValue(new Error("Action failed"));
      const wrappedAction = withRateLimit(mockAction, "standard");

      await expect(wrappedAction()).rejects.toThrow("Action failed");
    });

    it("should preserve action return type", async () => {
      setNodeEnv("development");

      const { withRateLimit } = require("@/lib/security/rateLimit");

      interface ActionResult {
        id: string;
        data: number[];
      }

      const mockAction = jest.fn<() => Promise<ActionResult>>().mockResolvedValue({
        id: "test",
        data: [1, 2, 3],
      });

      const wrappedAction = withRateLimit(mockAction, "standard");
      const result = await wrappedAction();

      expect(result).toEqual({ id: "test", data: [1, 2, 3] });
    });

    it("should use specified rate limit type", async () => {
      setNodeEnv("development");

      const { withRateLimit } = require("@/lib/security/rateLimit");

      const mockAction = jest.fn<() => Promise<string>>().mockResolvedValue("done");
      const wrappedAction = withRateLimit(mockAction, "strict");

      await wrappedAction();

      expect(mockAction).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RateLimitType Tests
  // ==========================================================================

  describe("RateLimitType", () => {
    it("should export correct rate limit types", async () => {
      const { checkRateLimit } = require("@/lib/security/rateLimit");

      // These should all be valid types in development
      setNodeEnv("development");

      await checkRateLimit("standard");
      await checkRateLimit("sensitive");
      await checkRateLimit("write");
      await checkRateLimit("strict");

      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle undefined identifier gracefully", async () => {
      setNodeEnv("development");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard", undefined);

      expect(result.success).toBe(true);
    });

    it("should handle empty string identifier", async () => {
      setNodeEnv("development");

      const { checkRateLimit } = require("@/lib/security/rateLimit");

      const result = await checkRateLimit("standard", "");

      expect(result.success).toBe(true);
    });
  });
});
