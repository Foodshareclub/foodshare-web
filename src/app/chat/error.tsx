"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Chat Error Boundary
 * Catches and displays errors in the chat route segment
 */
export default function ChatError({
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
      variant="chat"
      description="We couldn't load your chat. This might be a temporary issue."
    />
  );
}
