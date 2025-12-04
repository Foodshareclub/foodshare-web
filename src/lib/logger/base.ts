/**
 * Base Logger
 * Beautiful, structured logging with error tracking for production debugging
 */

import type { LogLevel, LogContext, ErrorLog } from "./types";

// Store recent errors for debugging
const errorHistory: ErrorLog[] = [];
const MAX_ERROR_HISTORY = 50;

// Emoji mapping for log levels
const EMOJI_MAP: Record<LogLevel, string> = {
  debug: "🔍",
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
  success: "✅",
};

// Color mapping for console
const COLOR_MAP: Record<LogLevel, string> = {
  debug: "#6B7280",
  info: "#3B82F6",
  warn: "#F59E0B",
  error: "#EF4444",
  success: "#10B981",
};

/**
 * Format timestamp
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): ErrorLog {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    stack: error?.stack,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
    url: typeof window !== "undefined" ? window.location.href : "SSR",
  };
}

/**
 * Store error in history
 */
function storeError(logEntry: ErrorLog) {
  errorHistory.push(logEntry);
  if (errorHistory.length > MAX_ERROR_HISTORY) {
    errorHistory.shift();
  }
}

/**
 * Format log message with styling
 */
function formatLog(level: LogLevel, message: string, context?: LogContext, data?: unknown) {
  const emoji = EMOJI_MAP[level];
  const color = COLOR_MAP[level];
  const timestamp = getTimestamp();

  const prefix = `${emoji} [${timestamp}]`;
  const contextStr = context
    ? ` [${Object.entries(context)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ")}]`
    : "";

  // Use console group for better organization
  if (data || context) {
    console.groupCollapsed(
      `%c${prefix} ${message}${contextStr}`,
      `color: ${color}; font-weight: bold;`
    );

    if (context) {
      console.log("%cContext:", "color: #8B5CF6; font-weight: bold;", context);
    }

    if (data) {
      console.log("%cData:", "color: #06B6D4; font-weight: bold;", data);
    }

    console.groupEnd();
  } else {
    console.log(`%c${prefix} ${message}`, `color: ${color}; font-weight: bold;`);
  }
}

/**
 * Logger class
 */
export class Logger {
  private component?: string;

  constructor(component?: string) {
    this.component = component;
  }

  /**
   * Debug log (development only)
   */
  debug(message: string, context?: LogContext, data?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      formatLog("debug", message, { ...context, component: this.component }, data);
    }
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext, data?: unknown) {
    formatLog("info", message, { ...context, component: this.component }, data);
  }

  /**
   * Success log
   */
  success(message: string, context?: LogContext, data?: unknown) {
    formatLog("success", message, { ...context, component: this.component }, data);
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext, data?: unknown) {
    formatLog("warn", message, { ...context, component: this.component }, data);

    const logEntry = createLogEntry("warn", message, { ...context, component: this.component });
    storeError(logEntry);
  }

  /**
   * Error log with tracking
   */
  error(message: string, error?: Error, context?: LogContext, data?: unknown) {
    formatLog("error", message, { ...context, component: this.component }, data);

    if (error) {
      console.error("Error details:", error);
    }

    const logEntry = createLogEntry(
      "error",
      message,
      { ...context, component: this.component },
      error
    );
    storeError(logEntry);

    // Send to analytics in production
    if (process.env.NODE_ENV === "production") {
      this.sendToAnalytics(logEntry);
    }
  }

  /**
   * Log component lifecycle
   */
  lifecycle(event: "mount" | "unmount" | "update", context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      const emoji = event === "mount" ? "🎬" : event === "unmount" ? "🎬" : "🔄";
      console.log(
        `%c${emoji} [${getTimestamp()}] ${this.component || "Component"} ${event}`,
        "color: #8B5CF6; font-weight: bold;",
        context || ""
      );
    }
  }

  /**
   * Log API calls
   */
  api(method: string, endpoint: string, status?: number, duration?: number) {
    const emoji =
      status && status >= 200 && status < 300 ? "✅" : status && status >= 400 ? "❌" : "🔄";
    const color =
      status && status >= 200 && status < 300
        ? "#10B981"
        : status && status >= 400
          ? "#EF4444"
          : "#3B82F6";

    console.log(
      `%c${emoji} [${getTimestamp()}] ${method} ${endpoint}${status ? ` → ${status}` : ""}${duration ? ` (${duration}ms)` : ""}`,
      `color: ${color}; font-weight: bold;`
    );
  }

  /**
   * Send error to analytics service
   */
  private async sendToAnalytics(logEntry: ErrorLog) {
    // Skip on server side
    if (typeof window === "undefined") return;

    try {
      // Store in localStorage for debugging
      const key = `error_log_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(logEntry));

      // Keep only last 10 errors in localStorage
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("error_log_"));
      if (keys.length > 10) {
        keys.sort();
        keys.slice(0, keys.length - 10).forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // Silently fail if analytics fails
    }
  }
}

/**
 * Get error history for debugging
 */
export function getErrorHistory(): ErrorLog[] {
  return [...errorHistory];
}

/**
 * Export error history as JSON
 */
export function exportErrorHistory(): string {
  return JSON.stringify(errorHistory, null, 2);
}

/**
 * Clear error history
 */
export function clearErrorHistory() {
  errorHistory.length = 0;
}

/**
 * Create a logger instance
 */
export function createLogger(component?: string): Logger {
  return new Logger(component);
}

/**
 * Default logger instance
 */
export const logger = new Logger();
