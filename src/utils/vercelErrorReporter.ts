/**
 * Vercel Error Reporter
 * Reports errors to Vercel Analytics and logs for debugging
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("VercelErrorReporter");

interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  deployment: {
    env: string;
    region: string;
    commit: string;
    branch: string;
  };
  context?: Record<string, unknown>;
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get deployment information
 */
function getDeploymentInfo() {
  return {
    env: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    region: process.env.NEXT_PUBLIC_VERCEL_REGION || "unknown",
    commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",
    branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || "unknown",
  };
}

/**
 * Create error report
 */
function createErrorReport(error: Error, context?: Record<string, unknown>): ErrorReport {
  return {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    deployment: getDeploymentInfo(),
    context,
  };
}

/**
 * Send error to Vercel Analytics
 */
async function sendToVercelAnalytics(report: ErrorReport) {
  try {
    // Vercel Analytics automatically tracks errors via window.onerror
    // But we can also send custom events
    if ((window as unknown as Record<string, unknown>).va) {
      (
        (window as unknown as Record<string, unknown>).va as (
          action: string,
          event: string,
          data: Record<string, string>
        ) => void
      )("track", "Error", {
        error_id: report.id,
        error_message: report.message,
        deployment_env: report.deployment.env,
        deployment_region: report.deployment.region,
      });
    }
  } catch (error) {
    logger.warn("Failed to send error to Vercel Analytics", { error });
  }
}

/**
 * Store error locally for debugging
 */
function storeErrorLocally(report: ErrorReport) {
  try {
    const key = `vercel_error_${report.id}`;
    localStorage.setItem(key, JSON.stringify(report));

    // Keep only last 20 errors
    const errorKeys = Object.keys(localStorage).filter((k) => k.startsWith("vercel_error_"));
    if (errorKeys.length > 20) {
      errorKeys
        .sort()
        .slice(0, errorKeys.length - 20)
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch (error) {
    logger.warn("Failed to store error locally", { error });
  }
}

/**
 * Report error
 */
export async function reportError(error: Error, context?: Record<string, unknown>) {
  const report = createErrorReport(error, context);

  logger.error("Reporting error to Vercel", error, {
    errorId: report.id,
    deployment: report.deployment,
    ...context,
  });

  // Send to Vercel Analytics
  await sendToVercelAnalytics(report);

  // Store locally
  storeErrorLocally(report);

  return report;
}

/**
 * Get all stored errors
 */
export function getStoredErrors(): ErrorReport[] {
  const errorKeys = Object.keys(localStorage).filter((k) => k.startsWith("vercel_error_"));

  return errorKeys
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "");
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Clear stored errors
 */
export function clearStoredErrors() {
  const errorKeys = Object.keys(localStorage).filter((k) => k.startsWith("vercel_error_"));
  errorKeys.forEach((k) => localStorage.removeItem(k));
  logger.info("Cleared stored errors", { count: errorKeys.length });
}

/**
 * Export errors as JSON
 */
export function exportErrors(): string {
  const errors = getStoredErrors();
  return JSON.stringify(errors, null, 2);
}

/**
 * Monitor for deployment-specific errors
 */
export function monitorDeploymentErrors() {
  // Monitor for common Vercel deployment errors
  const errorPatterns = [
    {
      pattern: /FUNCTION_INVOCATION_TIMEOUT/i,
      message: "Serverless function timeout",
    },
    {
      pattern: /DEPLOYMENT_ERROR/i,
      message: "Deployment error",
    },
    {
      pattern: /BUILD_ERROR/i,
      message: "Build error",
    },
    {
      pattern: /EDGE_FUNCTION_INVOCATION_FAILED/i,
      message: "Edge function failed",
    },
  ];

  window.addEventListener("error", (event) => {
    const message = event.message || event.error?.message || "";

    errorPatterns.forEach(({ pattern, message: errorType }) => {
      if (pattern.test(message)) {
        logger.error(`Vercel ${errorType} detected`, event.error, {
          type: errorType,
          message,
        });

        reportError(event.error || new Error(message), { type: errorType });
      }
    });
  });
}

/**
 * Expose to window for debugging
 */
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__vercelErrors = {
    report: reportError,
    getStored: getStoredErrors,
    clear: clearStoredErrors,
    export: exportErrors,
  };
}
