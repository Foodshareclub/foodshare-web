"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Root Error Boundary Component
 * Catches and displays errors that occur in the application
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorDisplay error={error} reset={reset} variant="default" />;
}
