// ============================================================================
// Constants & Types
// ============================================================================

export const defaultLocale = "en" as const;

// Extended locale support for mobile app compatibility
export const supportedLocales = [
  "en",
  "cs",
  "de",
  "es",
  "fr",
  "pt",
  "ru",
  "uk",
  // New languages for global expansion
  "zh", // Chinese
  "hi", // Hindi
  "ar", // Arabic (RTL)
  "it", // Italian
  "pl", // Polish
  "nl", // Dutch
  "ja", // Japanese
  "ko", // Korean
  "tr", // Turkish
] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

// Locale metadata for enhanced UX (extended for mobile)
export const localeMetadata: Record<
  SupportedLocale,
  {
    name: string;
    nativeName: string;
    flag: string;
    direction: "ltr" | "rtl";
    code: string;
    region: string;
  }
> = {
  // Current languages
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
  // New Priority 1: High Impact Markets
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
  // New Priority 2: European Expansion
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
  // New Priority 3: Global Reach
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
};

// Backward compatibility exports
export const localeNames: Record<SupportedLocale, string> = Object.fromEntries(
  supportedLocales.map((locale) => [locale, localeMetadata[locale].name])
) as Record<SupportedLocale, string>;

export const localeNativeNames: Record<SupportedLocale, string> = Object.fromEntries(
  supportedLocales.map((locale) => [locale, localeMetadata[locale].nativeName])
) as Record<SupportedLocale, string>;

export const localeFlags: Record<SupportedLocale, string> = Object.fromEntries(
  supportedLocales.map((locale) => [locale, localeMetadata[locale].flag])
) as Record<SupportedLocale, string>;

// ============================================================================
// Validation & Detection
// ============================================================================

/**
 * Validates if a locale string is supported
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

/**
 * Normalizes a locale string to a supported locale
 */
export function normalizeLocale(locale: string): SupportedLocale {
  const normalized = locale.split("-")[0].toLowerCase();
  return isValidLocale(normalized) ? normalized : defaultLocale;
}

/**
 * Gets the best matching locale from browser preferences
 */
export function getBrowserLocale(): SupportedLocale {
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets locale direction (LTR/RTL)
 */
export function getLocaleDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return localeMetadata[locale].direction;
}

/**
 * Gets the full locale code (e.g., 'en-US')
 */
export function getLocaleCode(locale: SupportedLocale): string {
  return localeMetadata[locale].code;
}

/**
 * Formats a locale for display
 */
export function formatLocaleDisplay(
  locale: SupportedLocale,
  options: { showFlag?: boolean; showNative?: boolean; separator?: string } = {}
): string {
  const { showFlag = false, showNative = false, separator = " " } = options;
  const metadata = localeMetadata[locale];

  const parts: string[] = [];
  if (showFlag) parts.push(metadata.flag);
  parts.push(showNative ? metadata.nativeName : metadata.name);

  return parts.join(separator);
}

/**
 * Gets all available locales with their metadata
 */
export function getAvailableLocales(): Array<{
  locale: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}> {
  return supportedLocales.map((locale) => ({
    locale,
    ...localeMetadata[locale],
  }));
}
