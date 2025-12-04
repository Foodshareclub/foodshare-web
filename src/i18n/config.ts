/**
 * next-intl Configuration
 * Centralized i18n configuration for FoodShare
 */

export const defaultLocale = 'en' as const;

export const locales = [
  'en', 'cs', 'de', 'es', 'fr', 'pt', 'ru', 'uk',
  'zh', 'hi', 'ar', 'it', 'pl', 'nl', 'ja', 'ko', 'tr'
] as const;

export type Locale = (typeof locales)[number];

// Locale metadata for enhanced UX
export const localeMetadata: Record<
  Locale,
  {
    name: string;
    nativeName: string;
    flag: string;
    direction: 'ltr' | 'rtl';
    code: string;
    region: string;
  }
> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', direction: 'ltr', code: 'en-US', region: 'global' },
  cs: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', direction: 'ltr', code: 'cs-CZ', region: 'europe' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr', code: 'de-DE', region: 'europe' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr', code: 'es-ES', region: 'global' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr', code: 'fr-FR', region: 'global' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', direction: 'ltr', code: 'pt-PT', region: 'global' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr', code: 'ru-RU', region: 'europe' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', direction: 'ltr', code: 'uk-UA', region: 'europe' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', direction: 'ltr', code: 'zh-CN', region: 'asia' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr', code: 'hi-IN', region: 'asia' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl', code: 'ar-SA', region: 'mena' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr', code: 'it-IT', region: 'europe' },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', direction: 'ltr', code: 'pl-PL', region: 'europe' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', direction: 'ltr', code: 'nl-NL', region: 'europe' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr', code: 'ja-JP', region: 'asia' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr', code: 'ko-KR', region: 'asia' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', direction: 'ltr', code: 'tr-TR', region: 'mena' },
};

// Backward compatibility exports
export const localeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].name])
) as Record<Locale, string>;

export const localeNativeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].nativeName])
) as Record<Locale, string>;

export const localeFlags: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].flag])
) as Record<Locale, string>;

/**
 * Validates if a locale string is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Normalizes a locale string to a supported locale
 */
export function normalizeLocale(locale: string): Locale {
  const normalized = locale.split('-')[0].toLowerCase();
  return isValidLocale(normalized) ? normalized : defaultLocale;
}

/**
 * Gets the best matching locale from browser preferences
 */
export function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }

  const browserLocales = navigator.languages || [navigator.language];

  for (const browserLocale of browserLocales) {
    const locale = normalizeLocale(browserLocale);
    if (locale !== defaultLocale || browserLocale.startsWith('en')) {
      return locale;
    }
  }

  return defaultLocale;
}

/**
 * Gets locale direction (LTR/RTL)
 */
export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeMetadata[locale].direction;
}

/**
 * Gets the full locale code (e.g., 'en-US')
 */
export function getLocaleCode(locale: Locale): string {
  return localeMetadata[locale].code;
}

/**
 * Gets all available locales with their metadata
 */
export function getAvailableLocales(currentLocale: Locale): Array<{
  locale: Locale;
  name: string;
  nativeName: string;
  flag: string;
  isCurrent: boolean;
}> {
  return locales.map((locale) => ({
    locale,
    ...localeMetadata[locale],
    isCurrent: locale === currentLocale,
  }));
}
