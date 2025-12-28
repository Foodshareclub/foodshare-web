/**
 * Sentry Edge Runtime Configuration
 * Handles edge function error tracking
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Reduced sample rate for edge (high volume)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Filter middleware noise
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
