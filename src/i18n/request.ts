import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isValidLocale, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !isValidLocale(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

/**
 * Load messages for a specific locale (used in providers)
 */
export async function getMessages(locale: Locale) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // Fallback to English if locale messages not found
    return (await import(`../../messages/en.json`)).default;
  }
}
