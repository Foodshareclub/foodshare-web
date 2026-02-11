/**
 * Backend-Level Internationalization System
 * Universal i18n for Web + Mobile (React Native) + Supabase
 *
 * This module provides:
 * 1. Server-side translation storage in Supabase
 * 2. API for mobile apps to fetch translations
 * 3. Automatic locale detection from device/browser
 * 4. Fallback chain support
 * 5. RTL language support (Arabic, Hebrew)
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// Extended Locale Support (including new languages)
// ============================================================================

export const extendedLocales = [
  // Current languages
  "en",
  "cs",
  "de",
  "es",
  "fr",
  "pt",
  "ru",
  "uk",
  // Priority 1: High Impact
  "zh", // Chinese Simplified
  "hi", // Hindi
  "ar", // Arabic (RTL)
  // Priority 2: European
  "it", // Italian
  "pl", // Polish
  "nl", // Dutch
  // Priority 3: Global
  "ja", // Japanese
  "ko", // Korean
  "tr", // Turkish
] as const;

export type ExtendedLocale = (typeof extendedLocales)[number];

export const extendedLocaleMetadata: Record<
  ExtendedLocale,
  {
    name: string;
    nativeName: string;
    flag: string;
    direction: "ltr" | "rtl";
    code: string;
    region: string;
  }
> = {
  // Current
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
  // New Priority 1
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
  // New Priority 2
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
  // New Priority 3
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

// ============================================================================
// Backend Translation API (for Mobile Apps)
// ============================================================================

export interface TranslationBundle {
  locale: ExtendedLocale;
  version: string;
  messages: Record<string, string>;
  updatedAt: string;
}

/**
 * Fetches translations from Supabase for mobile apps
 * Mobile apps call this API to get their translation bundle
 */
export async function fetchTranslationsForMobile(
  locale: ExtendedLocale,
  version?: string
): Promise<TranslationBundle | null> {
  try {
    const query = supabase.from("translations").select("*").eq("locale", locale);

    if (version) {
      query.gt("version", version); // Only get if newer version exists
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Failed to fetch translations:", error);
      return null;
    }

    return data as TranslationBundle;
  } catch (error) {
    console.error("Translation fetch error:", error);
    return null;
  }
}

/**
 * Stores/updates translations in Supabase
 * Used by admin to sync translations to backend
 */
export async function syncTranslationsToBackend(
  locale: ExtendedLocale,
  messages: Record<string, string>
): Promise<boolean> {
  try {
    const { error } = await supabase.from("translations").upsert(
      {
        locale,
        messages,
        version: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "locale",
      }
    );

    if (error) {
      console.error("Failed to sync translations:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Translation sync error:", error);
    return false;
  }
}

// ============================================================================
// User Locale Preferences (stored in Supabase)
// ============================================================================

export interface UserLocalePreference {
  userId: string;
  locale: ExtendedLocale;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
}

/**
 * Gets user's locale preference from Supabase
 */
export async function getUserLocalePreference(
  userId: string
): Promise<UserLocalePreference | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("locale, timezone, date_format, number_format")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    userId,
    locale: data.locale as ExtendedLocale,
    timezone: data.timezone,
    dateFormat: data.date_format,
    numberFormat: data.number_format,
  };
}

/**
 * Saves user's locale preference to Supabase
 */
export async function saveUserLocalePreference(
  userId: string,
  locale: ExtendedLocale
): Promise<boolean> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      locale,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  return !error;
}

// ============================================================================
// Device/Platform Locale Detection
// ============================================================================

export interface DeviceLocaleInfo {
  locale: ExtendedLocale;
  source: "user_preference" | "device" | "browser" | "ip_geolocation" | "default";
  confidence: number;
}

/**
 * Detects the best locale for a user/device
 * Priority: User preference > Device setting > Browser > IP Geolocation > Default
 */
export async function detectBestLocale(
  userId?: string,
  deviceLocale?: string,
  browserLocales?: string[],
  ipCountry?: string
): Promise<DeviceLocaleInfo> {
  // 1. Check user preference (highest priority)
  if (userId) {
    const pref = await getUserLocalePreference(userId);
    if (pref) {
      return {
        locale: pref.locale,
        source: "user_preference",
        confidence: 1.0,
      };
    }
  }

  // 2. Check device locale (mobile apps)
  if (deviceLocale) {
    const normalized = normalizeToExtendedLocale(deviceLocale);
    if (normalized) {
      return {
        locale: normalized,
        source: "device",
        confidence: 0.9,
      };
    }
  }

  // 3. Check browser locales (web)
  if (browserLocales?.length) {
    for (const bl of browserLocales) {
      const normalized = normalizeToExtendedLocale(bl);
      if (normalized) {
        return {
          locale: normalized,
          source: "browser",
          confidence: 0.8,
        };
      }
    }
  }

  // 4. IP-based geolocation fallback
  if (ipCountry) {
    const locale = countryToLocale(ipCountry);
    if (locale) {
      return {
        locale,
        source: "ip_geolocation",
        confidence: 0.5,
      };
    }
  }

  // 5. Default fallback
  return {
    locale: "en",
    source: "default",
    confidence: 0.1,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeToExtendedLocale(locale: string): ExtendedLocale | null {
  const normalized = locale.split("-")[0].toLowerCase();
  return extendedLocales.includes(normalized as ExtendedLocale)
    ? (normalized as ExtendedLocale)
    : null;
}

function countryToLocale(countryCode: string): ExtendedLocale | null {
  const countryLocaleMap: Record<string, ExtendedLocale> = {
    US: "en",
    GB: "en",
    AU: "en",
    CA: "en",
    DE: "de",
    AT: "de",
    CH: "de",
    FR: "fr",
    BE: "fr",
    ES: "es",
    MX: "es",
    AR: "es",
    PT: "pt",
    BR: "pt",
    RU: "ru",
    UA: "uk",
    CZ: "cs",
    CN: "zh",
    TW: "zh",
    HK: "zh",
    IN: "hi",
    SA: "ar",
    AE: "ar",
    EG: "ar",
    IT: "it",
    PL: "pl",
    NL: "nl",
    JP: "ja",
    KR: "ko",
    TR: "tr",
  };
  return countryLocaleMap[countryCode.toUpperCase()] || null;
}

/**
 * Gets RTL languages for styling
 */
export function isRTLLocale(locale: ExtendedLocale): boolean {
  return extendedLocaleMetadata[locale].direction === "rtl";
}

/**
 * Gets all RTL locales
 */
export function getRTLLocales(): ExtendedLocale[] {
  return extendedLocales.filter((l) => extendedLocaleMetadata[l].direction === "rtl");
}

// ============================================================================
// Export for use in mobile apps
// ============================================================================

export const i18nBackend = {
  fetchTranslations: fetchTranslationsForMobile,
  syncTranslations: syncTranslationsToBackend,
  getUserPreference: getUserLocalePreference,
  saveUserPreference: saveUserLocalePreference,
  detectLocale: detectBestLocale,
  isRTL: isRTLLocale,
  locales: extendedLocales,
  metadata: extendedLocaleMetadata,
};
