"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Challenge Error Boundary
 * Handles errors when loading challenges page
 */
export default function ChallengeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      variant="compact"
      title="Something went wrong"
      description="We couldn't load the challenges. Please try again."
    />
  );
}
