/**
 * Sentry Client Configuration
 * Handles browser-side error tracking and performance monitoring
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay disabled to reduce client bundle (~50KB savings)
  // Re-enable if debugging specific user issues
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Integrations - replay removed to reduce bundle size
  integrations: [Sentry.browserTracingIntegration()],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // User-initiated navigation
    "AbortError",
    // Third-party script errors
    /^Script error\.?$/,
  ],

  // Before sending, add custom context
  beforeSend(event, _hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[Sentry] Would send event:", event.message);
      return null;
    }

    return event;
  },
});
