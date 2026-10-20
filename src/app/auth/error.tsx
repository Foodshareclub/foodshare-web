"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("AuthFlow");
  const tAuth = useTranslations("Auth");

  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      variant="default"
      // Props, not children — which is why `check:i18n-text` never saw them.
      // Two English sentences on the boundary that renders when authentication
      // has already gone wrong, which is the worst possible moment to be reading
      // English.
      title={t("errorTitle")}
      description={t("errorBody")}
      icon="🔐"
      footerContent={
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">{tAuth("errorHavingTrouble")}</p>
        </div>
      }
    />
  );
}
