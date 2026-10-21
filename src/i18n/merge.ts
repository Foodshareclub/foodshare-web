import { type Locale, defaultLocale } from "./config";

/**
 * next-intl does NOT fall back to the default locale for a missing key. Its
 * default `getMessageFallback` returns the key path itself and logs a
 * `MISSING_MESSAGE` error, so an untranslated string renders literally on
 * screen — e.g. a Portuguese user sees `Chat.messages` instead of a label.
 *
 * `messages/*.json` is not uniform: at the time of writing 20 of 21 locales
 * were missing between 1 and 184 keys each, and the gaps are structured (whole
 * namespaces such as `Chat` (45 keys) and `Reports` (21) were introduced after
 * the translations were written). Shallow-spreading `en` under the locale would
 * therefore not help — it would replace a partially-translated `Chat` object
 * wholesale and throw away the keys that *are* translated. This deep merge keeps
 * every translated string and only fills genuine holes.
 *
 * Trade-off: a partially-translated namespace can now surface a mix of locales
 * (e.g. Portuguese labels with a handful of English ones) instead of a uniform
 * block of raw keys. That is the better failure mode — a wrong-language string
 * is readable, `Chat.messages` is not.
 */

type Messages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively layer `fallback` (English) beneath `locale`.
 *
 * `locale` always wins. Only keys absent from `locale` are taken from
 * `fallback`, and only where the value is a nested object do we recurse —
 * an array or scalar in `locale` replaces the fallback entirely rather than
 * being merged element-wise, since translations do not align by index.
 *
 * The fallback catalog is never mutated, and neither is the locale catalog.
 */
export function mergeWithFallback(localeMessages: Messages, fallbackMessages: Messages): Messages {
  const result: Messages = { ...localeMessages };

  for (const [key, fallbackValue] of Object.entries(fallbackMessages)) {
    const localeValue = result[key];

    if (localeValue === undefined) {
      result[key] = fallbackValue;
      continue;
    }

    if (isPlainObject(localeValue) && isPlainObject(fallbackValue)) {
      result[key] = mergeWithFallback(localeValue, fallbackValue);
    }
    // Otherwise the locale value wins untouched: a translated scalar, array or
    // explicit null in the locale file is a deliberate override.
  }

  return result;
}

const catalogCache = new Map<string, Messages>();

/**
 * Load a locale catalog with English layered underneath.
 *
 * Deduplicates the two dynamic imports: the same locale is requested once per
 * process. `next-intl` calls this on every render of a server component, so
 * without the cache a 555-key JSON is re-parsed per call.
 */
export async function loadMessagesWithFallback(locale: Locale): Promise<Messages> {
  const cached = catalogCache.get(locale);
  if (cached) return cached;

  // Both imports are needed even for "en": the fallback is the identity in
  // that case, but keeping the shape uniform avoids a special case below.
  const [localeModule, fallbackModule] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/${defaultLocale}.json`),
  ]);

  const localeMessages = localeModule.default as Messages;
  const fallbackMessages = fallbackModule.default as Messages;

  const merged = locale === defaultLocale ? localeMessages : mergeWithFallback(localeMessages, fallbackMessages);

  catalogCache.set(locale, merged);
  return merged;
}
