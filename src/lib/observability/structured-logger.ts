/**
 * Structured logger for observability and performance monitoring.
 *
 * Console output is kept for local dev; error/fatal entries are additionally
 * forwarded to Sentry so production logs become actionable issues (with
 * release + context tags for suspect-commit → PR linkage).
 */
export function structuredLog(context: string, message: string, data?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    message,
    ...(data && { data }),
  };

  // Console logging (kept for local dev visibility)
  console[process.env.NODE_ENV === "production" ? "warn" : "log"](
    `[observability] ${context}: ${message}`,
    data
  );

  // Forward errors to Sentry in production (dynamic import avoids cycles and
  // keeps the logger safe in edge/client bundles without Sentry initialized).
  if (
    process.env.NODE_ENV === "production" &&
    /error|fatal|exception/i.test(`${context} ${message}`)
  ) {
    void import("./sentry")
      .then(({ captureLog }) =>
        captureLog(`${context}: ${message}`, "error", { component: context, metadata: data })
      )
      .catch(() => undefined);
  }

  return logEntry;
}
