import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

/**
 * The title resolves per request, like the two pages above it. This one is
 * reached from a link inside an email, which is the likeliest route into the site
 * for a reader whose locale is not English — so the `<title>` in their tab was
 * the most likely first thing to be wrong.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("AuthFlow"), getLocale()]);

  return generatePageMetadata({
    title: t("metaForgotTitle"),
    description: t("metaForgotDescription"),
    keywords: ["forgot password", "reset password", "FoodShare", "account"],
    path: "/auth/forgot-password",
    locale,
    noIndex: true,
  });
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
