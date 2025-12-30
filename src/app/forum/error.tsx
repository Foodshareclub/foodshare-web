"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Forum Error Boundary Component
 * Handles errors specific to the forum section
 */
export default function ForumError({
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
