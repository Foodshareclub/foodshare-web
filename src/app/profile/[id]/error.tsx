"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Profile Detail Error Boundary Component
 * Handles errors when loading user profile
 */
export default function ProfileError({
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
      title="Profile Not Found"
      description="We couldn't load this profile. The user may not exist or there was a server error."
      icon="👤"
    />
  );
}
