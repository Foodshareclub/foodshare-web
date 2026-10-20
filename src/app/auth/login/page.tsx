import { generatePageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LoginForm } from "./LoginForm";

/**
 * The title resolves per request, like `/help` since Phase 16.
 *
 * This page used to be a single `"use client"` file with no `generateMetadata` at
 * all, so `<title>` came from `auth/layout.tsx` as a hardcoded English `"Login"`
 * in every locale — on the page a person is most likely to have open in a second
 * tab while they go looking for their password.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("AuthFlow"), getLocale()]);

  return generatePageMetadata({
    title: t("metaLoginTitle"),
    description: t("metaLoginDescription"),
    // Keywords stay English: they are an indexing hint, not visible copy, and
    // the terms people search for here are English.
    keywords: ["login", "sign in", "FoodShare", "food sharing", "account"],
    path: "/auth/login",
    locale,
    noIndex: true,
  });
}

export default function LoginPage() {
  return <LoginForm />;
}
