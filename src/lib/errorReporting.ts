/**
 * Error Reporting Service
 * Provides unified error tracking and reporting via Sentry
 */
import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Types
// ============================================================================

export interface ErrorContext {
  /** User ID if authenticated */
  userId?: string;
  /** Current page/route */
  route?: string;
  /** Component or function name */
  componentName?: string;
  /** Action being performed */
  action?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  /** Error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** Error context */
  context: ErrorContext;
  /** Timestamp */
  timestamp: string;
  /** Error severity */
  severity: "info" | "warning" | "error" | "fatal";
  /** Browser/environment info */
  environment: {
    userAgent?: string;
    url?: string;
    isServer: boolean;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const config = {
  /** Enable reporting in development */
  enableInDev: true,
  /** Log to console */
  logToConsole: true,
  /** Sample rate for non-fatal errors (0-1) */
  sampleRate: 1.0,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getEnvironmentInfo(): ErrorReport["environment"] {
  const isServer = typeof window === "undefined";

  return {
    userAgent: isServer ? undefined : navigator.userAgent,
    url: isServer ? undefined : window.location.href,
    isServer,
  };
}

function shouldReport(severity: ErrorReport["severity"]): boolean {
  // Always report fatal errors
  if (severity === "fatal") return true;

  // In production, apply sample rate
  if (process.env.NODE_ENV === "production") {
    return Math.random() < config.sampleRate;
  }

  // In development, respect config
  return config.enableInDev;
}

function formatErrorForConsole(report: ErrorReport): void {
  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    fatal: "💀",
  }[report.severity];

  const _style = {
    info: "color: #3b82f6",
    warning: "color: #f59e0b",
    error: "color: #ef4444",
    fatal: "color: #dc2626; font-weight: bold",
  }[report.severity];

  console.groupCollapsed(`${emoji} [${report.severity.toUpperCase()}] ${report.message}`);
  console.log("%cTimestamp:", "font-weight: bold", report.timestamp);
  console.log("%cContext:", "font-weight: bold", report.context);
  if (report.stack) {
    console.log("%cStack Trace:", "font-weight: bold");
    console.log(report.stack);
  }
  console.log("%cEnvironment:", "font-weight: bold", report.environment);
  console.groupEnd();
}

// ============================================================================
// Error Queue for Batching
// ============================================================================

let errorQueue: ErrorReport[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function queueError(report: ErrorReport): void {
  // Send directly to Sentry instead of queuing
  const sentryLevel = {
    info: "info" as const,
    warning: "warning" as const,
    error: "error" as const,
    fatal: "fatal" as const,
  }[report.severity];

  Sentry.captureMessage(report.message, {
    level: sentryLevel,
    tags: {
      component: report.context.componentName,
      action: report.context.action,
      route: report.context.route,
    },
    extra: {
      ...report.context.metadata,
      environment: report.environment,
      timestamp: report.timestamp,
    },
    user: report.context.userId ? { id: report.context.userId } : undefined,
  });

  // Also add to legacy queue for backwards compatibility
  errorQueue.push(report);

  // Flush immediately for fatal errors
  if (report.severity === "fatal") {
    flushErrorQueue();
    return;
  }

  // Debounce flush for other errors
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  flushTimeout = setTimeout(flushErrorQueue, 1000);
}

async function flushErrorQueue(): Promise<void> {
  if (errorQueue.length === 0) return;
  // Clear queue - Sentry handles sending
  errorQueue = [];
}

// ============================================================================
// Main Reporting Functions
// ============================================================================

/**
 * Report an error with full context
 */
export function reportError(
  error: Error | string,
  context: ErrorContext = {},
  severity: ErrorReport["severity"] = "error"
): void {
  if (!shouldReport(severity)) return;

  const report: ErrorReport = {
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    severity,
    environment: getEnvironmentInfo(),
  };

  if (config.logToConsole) {
    formatErrorForConsole(report);
  }

  queueError(report);
}

/**
 * Report an info-level event
 */
export function reportInfo(message: string, context: ErrorContext = {}): void {
  reportError(message, context, "info");
}

/**
 * Report a warning
 */
export function reportWarning(message: string, context: ErrorContext = {}): void {
  reportError(message, context, "warning");
}

/**
 * Report a fatal error (always reported)
 */
export function reportFatal(error: Error | string, context: ErrorContext = {}): void {
  reportError(error, context, "fatal");
}

// ============================================================================
// React Error Boundary Integration
// ============================================================================

/**
 * Report error from React Error Boundary
 */
export function reportBoundaryError(error: Error, errorInfo: { componentStack?: string }): void {
  reportError(
    error,
    {
      componentName: "ErrorBoundary",
      metadata: { componentStack: errorInfo.componentStack },
    },
    "fatal"
  );
}

// ============================================================================
// Server Action Error Wrapper
// ============================================================================

/**
 * Wrap a server action with error reporting
 */
export function withErrorReporting<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  actionName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await action(...args);
    } catch (error) {
      reportError(
        error instanceof Error ? error : new Error(String(error)),
        { action: actionName, metadata: { args } },
        "error"
      );
      throw error;
    }
  };
}

// ============================================================================
// Global Error Handlers
// ============================================================================

/**
 * Initialize global error handlers (call once at app startup)
 */
export function initializeErrorReporting(): void {
  if (typeof window === "undefined") return;

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    reportError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { action: "unhandledrejection" },
      "error"
    );
  });

  // Catch global errors
  window.addEventListener("error", (event) => {
    reportError(
      event.error instanceof Error ? event.error : new Error(event.message),
      {
        action: "globalError",
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      },
      "error"
    );
  });

  // Flush on page unload
  window.addEventListener("beforeunload", () => {
    flushErrorQueue();
  });
}

// ============================================================================
// User Context
// ============================================================================

let currentUserId: string | undefined;

/**
 * Set current user for error context
 */
export function setErrorReportingUser(userId: string | undefined): void {
  currentUserId = userId;
  // Also set Sentry user context
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Get current user ID for error context
 */
export function getErrorReportingUser(): string | undefined {
  return currentUserId;
}
