"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Auth Error Boundary Component
 * Handles errors during authentication flows
 */
export default function AuthError({
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
      variant="default"
      title="Authentication Error"
      description="We encountered an issue with authentication. Please try again."
      icon="🔐"
      footerContent={
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            Having trouble? Try clearing your browser cookies or contact support.
          </p>
        </div>
      }
    />
  );
}
