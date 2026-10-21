/**
 * next-intl Configuration
 * Centralized i18n configuration for FoodShare
 */

export const defaultLocale = "en" as const;

export const locales = [
  "en",
  "cs",
  "de",
  "es",
  "fr",
  "pt",
  "ru",
  "uk",
  "zh",
  "hi",
  "ar",
  "it",
  "pl",
  "nl",
  "ja",
  "ko",
  "tr",
  "vi",
  "id",
  "th",
  "sv",
] as const;

export type Locale = (typeof locales)[number];

// Locale metadata for enhanced UX
export const localeMetadata: Record<
  Locale,
  {
    name: string;
    nativeName: string;
    flag: string;
    direction: "ltr" | "rtl";
    code: string;
    region: string;
  }
> = {
  en: {
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    direction: "ltr",
    code: "en-US",
    region: "global",
  },
  cs: {
    name: "Czech",
    nativeName: "Čeština",
    flag: "🇨🇿",
    direction: "ltr",
    code: "cs-CZ",
    region: "europe",
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    direction: "ltr",
    code: "de-DE",
    region: "europe",
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    direction: "ltr",
    code: "es-ES",
    region: "global",
  },
  fr: {
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    direction: "ltr",
    code: "fr-FR",
    region: "global",
  },
  pt: {
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    direction: "ltr",
    code: "pt-PT",
    region: "global",
  },
  ru: {
    name: "Russian",
    nativeName: "Русский",
    flag: "🇷🇺",
    direction: "ltr",
    code: "ru-RU",
    region: "europe",
  },
  uk: {
    name: "Ukrainian",
    nativeName: "Українська",
    flag: "🇺🇦",
    direction: "ltr",
    code: "uk-UA",
    region: "europe",
  },
  zh: {
    name: "Chinese",
    nativeName: "中文",
    flag: "🇨🇳",
    direction: "ltr",
    code: "zh-CN",
    region: "asia",
  },
  hi: {
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    direction: "ltr",
    code: "hi-IN",
    region: "asia",
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    direction: "rtl",
    code: "ar-SA",
    region: "mena",
  },
  it: {
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    direction: "ltr",
    code: "it-IT",
    region: "europe",
  },
  pl: {
    name: "Polish",
    nativeName: "Polski",
    flag: "🇵🇱",
    direction: "ltr",
    code: "pl-PL",
    region: "europe",
  },
  nl: {
    name: "Dutch",
    nativeName: "Nederlands",
    flag: "🇳🇱",
    direction: "ltr",
    code: "nl-NL",
    region: "europe",
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    direction: "ltr",
    code: "ja-JP",
    region: "asia",
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    flag: "🇰🇷",
    direction: "ltr",
    code: "ko-KR",
    region: "asia",
  },
  tr: {
    name: "Turkish",
    nativeName: "Türkçe",
    flag: "🇹🇷",
    direction: "ltr",
    code: "tr-TR",
    region: "mena",
  },
  vi: {
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    flag: "🇻🇳",
    direction: "ltr",
    code: "vi-VN",
    region: "asia",
  },
  id: {
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "🇮🇩",
    direction: "ltr",
    code: "id-ID",
    region: "asia",
  },
  th: {
    name: "Thai",
    nativeName: "ไทย",
    flag: "🇹🇭",
    direction: "ltr",
    code: "th-TH",
    region: "asia",
  },
  sv: {
    name: "Swedish",
    nativeName: "Svenska",
    flag: "🇸🇪",
    direction: "ltr",
    code: "sv-SE",
    region: "europe",
  },
};

// Backward compatibility exports
export const localeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].name]),
) as Record<Locale, string>;

export const localeNativeNames: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].nativeName]),
) as Record<Locale, string>;

export const localeFlags: Record<Locale, string> = Object.fromEntries(
  locales.map((locale) => [locale, localeMetadata[locale].flag]),
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
  const normalized = locale.split("-")[0].toLowerCase();
  return isValidLocale(normalized) ? normalized : defaultLocale;
}

/**
 * Gets the saved locale.
 *
 * The cookie is checked *first*, and the order matters now that the server
 * derives its locale from the cookie. It used to be localStorage first, which
 * created a second way for the client and the server to disagree about the
 * locale in the same session — and the only place either of them reads the
 * value is a place that decides what the whole tree renders. Reachable today:
 * a visitor who picked a language, then cleared cookies (or hit Safari's ITP
 * eviction), is left with localStorage only. The client then renders their old
 * language while every Server Component renders English, indefinitely.
 *
 * localStorage is still consulted second, so an existing preference is not lost
 * when the cookie is absent.
 */
export function getSavedLocale(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cookieMatch = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  if (cookieMatch && isValidLocale(cookieMatch[1])) {
    return cookieMatch[1] as Locale;
  }

  const localStorageLocale = localStorage.getItem("locale");
  if (localStorageLocale && isValidLocale(localStorageLocale)) {
    return localStorageLocale;
  }

  return null;
}

/**
 * Gets the best matching locale from browser preferences
 * Priority: saved preference > browser language > default
 */
export function getBrowserLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  // First check for saved user preference
  const savedLocale = getSavedLocale();
  if (savedLocale) {
    return savedLocale;
  }

  // Fall back to browser language
  if (typeof navigator === "undefined") {
    return defaultLocale;
  }

  const browserLocales = navigator.languages || [navigator.language];

  for (const browserLocale of browserLocales) {
    const locale = normalizeLocale(browserLocale);
    if (locale !== defaultLocale || browserLocale.startsWith("en")) {
      return locale;
    }
  }

  return defaultLocale;
}

/**
 * Gets locale direction (LTR/RTL)
 */
export function getLocaleDirection(locale: Locale): "ltr" | "rtl" {
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
