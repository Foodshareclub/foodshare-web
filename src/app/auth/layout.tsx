import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * A neutral title for the whole auth tree, per locale.
 *
 * This was `generateNoIndexMetadata("Login", "Sign in to your FoodShare
 * account")` — two hardcoded English strings that every page under `/auth/*`
 * inherited, including `/auth/forgot-password` and `/auth/reset-password`, which
 * are not the login page. Each of those now sets its own title in its own
 * `generateMetadata`; this is the floor, not the answer.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("AuthFlow"), getLocale()]);

  return generatePageMetadata({
    title: t("metaAreaTitle"),
    description: t("metaAreaDescription"),
    path: "/auth/login",
    locale,
    // Authenticated pages are not for a result page. This was the one thing the
    // old `generateNoIndexMetadata` call was doing correctly.
    noIndex: true,
  });
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
