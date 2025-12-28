/**
 * Sentry Server Configuration
 * Handles server-side error tracking and performance monitoring
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring - lower sample rate for server
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Filter out expected errors
  ignoreErrors: [
    // Auth errors (expected user behavior)
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    // Network issues
    "ECONNRESET",
    "ETIMEDOUT",
  ],

  // Before sending, add custom context
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[Sentry Server] Would send event:", event.message);
      return null;
    }

    // Filter out Supabase auth errors (expected flow)
    const error = hint.originalException;
    if (error instanceof Error) {
      if (error.message.includes("Auth session missing")) {
        return null;
      }
    }

    return event;
  },
});
