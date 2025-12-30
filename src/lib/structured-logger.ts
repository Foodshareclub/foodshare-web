/**
 * Structured Logging Utility
 *
 * Provides consistent, structured logging across the application with:
 * - Request ID tracking for distributed tracing
 * - Log levels (debug, info, warn, error)
 * - Context injection (userId, action, duration)
 * - JSON output for log aggregation services
 * - Development-friendly console output
 */

import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_DEV = process.env.NODE_ENV === "development";

// Fields to redact from logs
const REDACT_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "creditCard",
  "ssn",
];

// ============================================================================
// Request ID Management
// ============================================================================

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get the current request ID from headers or generate a new one
 */
export async function getRequestId(): Promise<string> {
  try {
    const headerStore = await headers();
    return headerStore.get(REQUEST_ID_HEADER) || generateRequestId();
  } catch {
    // headers() not available (not in request context)
    return generateRequestId();
  }
}

// ============================================================================
// Redaction
// ============================================================================

/**
 * Deep redact sensitive fields from an object
 */
function redactSensitive(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  // Prevent circular reference issues
  if (seen.has(obj as object)) return "[Circular]";
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, seen));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (REDACT_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitive(value, seen);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // JSON output for production (log aggregation)
    return JSON.stringify(redactSensitive(entry));
  }

  // Pretty console output for development
  const { timestamp, level, message, context, error } = entry;
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m", // green
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m", // red
  };
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  let output = `${dim}${timestamp}${reset} ${levelColors[level]}[${level.toUpperCase()}]${reset} ${message}`;

  if (Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    output += ` ${dim}${contextStr}${reset}`;
  }

  if (error) {
    output += `\n${levelColors.error}Error: ${error.message}${reset}`;
    if (error.stack && IS_DEV) {
      output += `\n${dim}${error.stack}${reset}`;
    }
  }

  return output;
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log at specified level
   */
  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = formatLogEntry(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined;
    const ctx = error instanceof Error ? context : (error as LogContext);
    this.log("error", message, ctx, err);
  }

  /**
   * Time an async operation
   */
  async time<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`${label} failed`, error, { ...context, duration });
      throw error;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with request context
 */
export async function createRequestLogger(additionalContext?: LogContext): Promise<Logger> {
  const requestId = await getRequestId();
  return new Logger({ requestId, ...additionalContext });
}

/**
 * Create a logger for Server Actions
 */
export async function createActionLogger(actionName: string, userId?: string): Promise<Logger> {
  const requestId = await getRequestId();
  return new Logger({
    requestId,
    action: actionName,
    userId,
  });
}

/**
 * Create a logger for API routes
 */
export async function createRouteLogger(routePath: string): Promise<Logger> {
  const requestId = await getRequestId();
  return new Logger({
    requestId,
    route: routePath,
  });
}

// Re-export Logger class for testing
export { Logger };
