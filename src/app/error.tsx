"use client";

import { ErrorDisplay } from "@/components/error";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root Error Boundary Component
 * Catches and displays errors that occur in the application.
 * Forwards to Sentry with the route digest for issue/PR correlation.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { module: "RootError" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return <ErrorDisplay error={error} reset={reset} variant="default" />;
}
