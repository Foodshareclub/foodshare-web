"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global Error Handler
 * Catches errors in the root layout and provides a recovery UI
 * This is the last line of defense for unhandled errors
 * Also captures the error in Sentry for root-level crash reporting.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Capture error in Sentry on mount (avoiding useEffect for Bun prerender compatibility)
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        module: "GlobalError",
      },
      extra: {
        path: error.digest,
      },
    });
  }, []);

  // Log error on mount (avoiding useEffect for Bun prerender compatibility)
  if (typeof window !== "undefined") {
    console.error("Global error:", error);
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              We encountered an unexpected error. Please try again.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono">Error ID: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
