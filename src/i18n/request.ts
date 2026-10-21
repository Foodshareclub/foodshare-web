import { getRequestConfig } from "next-intl/server";
import { type Locale, defaultLocale, isValidLocale } from "./config";
import { loadMessagesWithFallback } from "./merge";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment. It is only set by
  // next-intl's middleware, which this app does not install — so in practice it
  // is undefined and every server component falls back to the default locale.
  // The cookie-aware path in `src/app/layout.tsx` is what actually drives the
  // locale for client components; see RequestContent there.
  const requested = await requestLocale;
  const locale: Locale = requested && isValidLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    // English is layered underneath so a key the locale is missing renders as
    // English rather than as its own key path — see the note in merge.ts.
    messages: (await loadMessagesWithFallback(locale)) as Record<string, string>,
  };
});

/**
 * Load messages for a specific locale (used in providers)
 */
export async function getMessages(locale: Locale) {
  try {
    return await loadMessagesWithFallback(locale);
  } catch {
    // Fallback to English if the locale's message file cannot be loaded at all
    return (await import(`../../messages/${defaultLocale}.json`)).default;
  }
}
