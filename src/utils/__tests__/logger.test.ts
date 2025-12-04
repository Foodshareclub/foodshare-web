/**
 * Logger Tests
 * Verify logging functionality
 */

import { logger, createLogger, getErrorHistory, clearErrorHistory } from "@/lib/logger";

describe("Logger", () => {
  beforeEach(() => {
    clearErrorHistory();
    jest.clearAllMocks();
  });

  it("should create a logger instance", () => {
    const componentLogger = createLogger("TestComponent");
    expect(componentLogger).toBeDefined();
  });

  it("should log info messages", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    logger.info("Test message");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should log success messages", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    logger.success("Success message");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should log warnings and store in history", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    logger.warn("Warning message");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    const history = getErrorHistory();
    expect(history.length).toBe(1);
    expect(history[0].level).toBe("warn");
  });

  it("should log errors and store in history", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const error = new Error("Test error");
    logger.error("Error message", error);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    const history = getErrorHistory();
    expect(history.length).toBe(1);
    expect(history[0].level).toBe("error");
    expect(history[0].stack).toBeDefined();
  });

  it("should include context in logs", () => {
    const consoleSpy = jest.spyOn(console, "groupCollapsed").mockImplementation();
    logger.info("Test with context", { userId: "123" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should clear error history", () => {
    logger.error("Error 1", new Error("Test"));
    logger.error("Error 2", new Error("Test"));
    expect(getErrorHistory().length).toBe(2);

    clearErrorHistory();
    expect(getErrorHistory().length).toBe(0);
  });

  it("should limit error history to 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      logger.error(`Error ${i}`, new Error(`Test ${i}`));
    }

    const history = getErrorHistory();
    expect(history.length).toBe(50);
  });

  it("should log API calls", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    logger.api("GET", "/api/users", 200, 150);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
