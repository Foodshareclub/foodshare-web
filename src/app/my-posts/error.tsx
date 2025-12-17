"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Error boundary for My Posts page
 */
export default function MyPostsError({
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
      description="We couldn't load your posts. This might be a temporary issue."
    />
  );
}
