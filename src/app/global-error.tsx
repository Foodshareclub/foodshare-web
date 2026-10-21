"use client";

import { type Locale, defaultLocale, getLocaleDirection, isValidLocale } from "@/i18n/config";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global Error Handler
 * Catches errors in the root layout and provides a recovery UI
 * This is the last line of defense for unhandled errors
 * Also captures the error in Sentry for root-level crash reporting.
 */
/**
 * Read and validate the `locale` cookie. An unvalidated value would end up in
 * the `lang` attribute of the document, so it goes through the same allowlist
 * the server and the shell script use.
 */
function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  const value = match?.[1];
  return value && isValidLocale(value) ? value : null;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The cookie, read defensively: this component replaces the whole document,
  // so it cannot inherit anything the failed tree resolved, and `document` may
  // not exist during a server render of the boundary.
  const cookieLocale = typeof document === "undefined" ? null : readLocaleCookie();
  const errorLocale = cookieLocale ?? defaultLocale;

  // Capture error in Sentry (re-runs if a different error replaces this one).
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        module: "GlobalError",
      },
      extra: {
        path: error.digest,
      },
    });
  }, [error]);

  // Log error on mount (avoiding useEffect for Bun prerender compatibility)
  if (typeof window !== "undefined") {
    console.error("Global error:", error);
  }

  return (
    // lang and dir both, from the same place the shell reads them. This had no
    // `dir` at all, so an Arabic user hitting an error boundary — the one moment
    // a person is already stuck — got a left-to-right document with no way for
    // the browser to correct it. The cookie is read directly because this
    // component replaces the entire document and cannot rely on anything the
    // failed tree rendered.
    <html lang={errorLocale} dir={getLocaleDirection(errorLocale)}>
      <body className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              aria-hidden="true"
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
            <p className="text-muted-foreground">We encountered an unexpected error. Please try again.</p>
            {error.digest && <p className="text-xs text-muted-foreground/60 font-mono">Error ID: {error.digest}</p>}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
