/**
 * API Mocking Tests
 *
 * Demonstrates MSW-based API mocking for testing.
 * 
 * NOTE: These tests require Node.js 18+ with native fetch support.
 * Run with: NODE_OPTIONS='--experimental-vm-modules' npm test
 */

import {
  mockSuccess,
  mockError,
  mockFactories,
} from "../mock-factories";

describe("API Mocking - Unit Tests", () => {
  describe("mockSuccess", () => {
    it("should create success response with correct format", () => {
      const data = { id: "123", name: "Test" };
      const response = mockSuccess(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta).toBeDefined();
      expect(response.meta?.requestId).toMatch(/^test-/);
    });
  });

  describe("mockError", () => {
    it("should create error response with correct format", () => {
      const response = mockError("NOT_FOUND", "Resource not found", { id: "123" });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe("NOT_FOUND");
      expect(response.error.message).toBe("Resource not found");
      expect(response.error.details).toEqual({ id: "123" });
    });
  });

  describe("mockFactories", () => {
    it("should create product with defaults", () => {
      const product = mockFactories.product();

      expect(product.id).toMatch(/^prod-/);
      expect(product.title).toBe("Test Product");
      expect(product.status).toBe("active");
    });

    it("should allow overrides", () => {
      const product = mockFactories.product({
        title: "Custom Title",
        status: "reserved",
      });

      expect(product.title).toBe("Custom Title");
      expect(product.status).toBe("reserved");
    });

    it("should create user with defaults", () => {
      const user = mockFactories.user();

      expect(user.id).toMatch(/^user-/);
      expect(user.email).toBe("test@example.com");
      expect(user.role).toBe("user");
    });

    it("should create room with defaults", () => {
      const room = mockFactories.room();

      expect(room.id).toMatch(/^room-/);
      expect(room.status).toBe("pending");
    });

    it("should create message with defaults", () => {
      const message = mockFactories.message();

      expect(message.id).toMatch(/^msg-/);
      expect(message.type).toBe("text");
    });
  });
});
