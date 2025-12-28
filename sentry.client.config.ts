/**
 * Sentry Client Configuration
 * Handles browser-side error tracking and performance monitoring
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay for debugging user issues
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

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
