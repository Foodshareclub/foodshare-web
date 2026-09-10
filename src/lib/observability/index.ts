/**
 * Observability utilities for logging, performance monitoring, and error tracking.
 *
 * Canonical implementations live here — import from `@/lib/observability`
 * directly in new code.
 */
export { structuredLog } from "./structured-logger";
export { captureError, captureLog, setSentryUser, type CaptureContext } from "./sentry";
// Backward-compatible re-exports: canonical error-reporting API lives in
// `@/lib/errorReporting`; re-exported here so `@/lib/observability` is the
// single import surface for logging + error capture.
export {
  reportError,
  reportInfo,
  reportWarning,
  reportFatal,
  reportBoundaryError,
  withErrorReporting,
  initializeErrorReporting,
  setErrorReportingUser,
  getErrorReportingUser,
  type ErrorContext,
  type ErrorReport,
} from "../errorReporting";
