"use client";

import { ErrorDisplay, AdminTroubleshootingSteps, AdminLinksFooter } from "@/components/error";

/**
 * Admin Error Boundary Component
 * Handles errors specific to the admin panel
 */
export default function AdminError({
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
      variant="admin"
      badge={{ label: "ADMIN PANEL", className: "bg-green-100 text-green-800" }}
      homeLink="/admin"
      footerContent={
        <>
          <AdminTroubleshootingSteps />
          <AdminLinksFooter />
        </>
      }
    />
  );
}
