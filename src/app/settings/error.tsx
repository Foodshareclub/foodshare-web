"use client";

import { ErrorDisplay } from "@/components/error";

/**
 * Settings Error Boundary Component
 * Handles errors when loading settings page
 */
export default function SettingsError({
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
      title="Settings Error"
      description="We couldn't load your settings. Please try again."
      icon="⚙️"
      homeLink="/settings"
    />
  );
}
