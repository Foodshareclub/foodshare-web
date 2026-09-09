"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorDisplay } from "@/components/error";

/**
 * Root Error Boundary Component
 * Catches and displays errors that occur in the application.
 * Forwards to Sentry with the route digest for issue/PR correlation.
 */
export default function Error({
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
