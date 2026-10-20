import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "./ResetPasswordForm";

/**
 * The title resolves per request, like the two pages above it. This one is
 * reached from a link inside an email, which is the likeliest route into the
 * site for a reader whose locale is not English — so the `<title>` in their
 * tab was the most likely first thing to be wrong.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("AuthFlow"), getLocale()]);

  return generatePageMetadata({
    title: t("metaResetTitle"),
    description: t("metaResetDescription"),
    keywords: ["reset password", "new password", "FoodShare", "account"],
    path: "/auth/reset-password",
    locale,
    noIndex: true,
  });
}

/**
 * The form itself is a client component — it owns the session check, the
 * password meter and the submit transition. This page is the server
 * component around it and carries the metadata.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
