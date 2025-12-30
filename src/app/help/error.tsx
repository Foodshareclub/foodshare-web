"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Help Error Boundary Component
 * Handles errors specific to the help section
 */
export default function HelpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-12">
      <ErrorDisplay error={error} reset={reset} variant="default" />
    </div>
  );
}
