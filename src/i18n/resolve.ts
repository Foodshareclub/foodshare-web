import { type Locale, defaultLocale, isValidLocale } from "./config";

/**
 * Resolve the locale for `X-NEXT-INTL-LOCALE`, the request header that
 * `getTranslations()` reads in a Server Component.
 *
 * `src/proxy.ts` sets this header so the server components calling
 * `getTranslations` (admin pages, /maintenance) render in the user's language.
 * Without it, next-intl's own `getRequestLocale()` finds no header,
 * `requestLocale` is undefined, and `getRequestConfig` silently falls back to
 * `en` — so those pages rendered in English for every user while client
 * components were correctly translated. next-intl's own middleware would
 * normally set this, but this app has no `[locale]` route segment and does not
 * install it.
 *
 * Kept separate from the proxy (which pulls in the Supabase and Upstash
 * clients) so the resolution rules are testable on their own.
 *
 * An unrecognised or forged cookie value is not trusted: it can only ever
 * select one of the 21 known locales, never arbitrary text. The value is
 * written into a request header, so a value like `en\r\nX-Admin: 1` would be a
 * response-splitting vector if it were passed through unchecked.
 */
export function resolveRequestLocale(cookieValue: string | undefined | null): Locale {
  return cookieValue && isValidLocale(cookieValue) ? cookieValue : defaultLocale;
}

/**
 * Pick a locale from an `Accept-Language` header, or null if nothing matches.
 *
 * Why this exists: the proxy used to write `locale=en` into the cookie on the
 * very first request, before looking at anything else. So a visitor whose
 * browser is set to German — and who had never chosen a language — was served
 * an English server render, and the client's post-hydration effect then swapped
 * to German. The mismatch was silent and permanent: no hydration error (the
 * first client render uses the server's `initialLocale`), but `lang="en"` in
 * the HTML for the whole session, every Server Component in English, and a full
 * second catalogue fetch. `Accept-Language` is on the request the proxy already
 * has, and was simply never read.
 *
 * Resolution rules, all of which real browsers exercise:
 *
 *   - Entries are ordered by q-value, highest first. `fr;q=0.9,de;q=1.0` is
 *     German, and taking the header in textual order gets that wrong.
 *   - A regional tag falls back to its base language: `de-AT` -> `de`,
 *     `pt-BR` -> `pt`, `zh-Hant-TW` -> `zh`.
 *   - An exact supported tag wins over a base-language match regardless of
 *     order, so `en-GB` prefers `en` over a later `en-US`… which is the same
 *     locale here, but the ordering is what makes `de` beat `en` when `de`
 *     merely *starts* the tag.
 *   - `*` matches the default and is not treated as a match for anything else.
 *   - `q=0` is an explicit refusal and is skipped. A browser sending
 *     `de;q=0, en` is saying "not German".
 *   - Case and surrounding whitespace are ignored, as the grammar requires.
 *
 * Returns null rather than a default when nothing matches, so the caller can
 * distinguish "no preference expressed" from "preference expressed and it is
 * English" — which matters, because only the former should write a cookie.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;

  const candidates = parseAcceptLanguage(acceptLanguage);
  if (candidates.length === 0) return null;

  for (const { tag, quality } of candidates) {
    // q=0 is an explicit refusal, not a last resort. Browsers use it to exclude
    // a language ("de;q=0,en"), and answering that with German is the opposite of
    // what was asked. Caught by the test asserting `negotiateLocale("de;q=0")`
    // is null — the first version sorted q=0 entries last and then still
    // returned them when they were the only ones.
    if (quality === 0) continue;

    if (tag === "*") return defaultLocale;

    const lower = tag.toLowerCase();

    // Exact match on the full tag, if the catalogue has one.
    if (isValidLocale(lower)) return lower;

    // Base language: `de-AT` -> `de`.
    const base = lower.split("-")[0];
    if (isValidLocale(base)) return base;
  }

  return null;
}

interface AcceptLanguageEntry {
  tag: string;
  /** Original q-value, 0..1. Unparseable values sort last, per the grammar. */
  quality: number;
}

/**
 * Parse `Accept-Language` into entries ordered by descending quality, stable
 * within a quality band.
 *
 * Kept separate and exported for testing: the ordering is where the subtle
 * bugs live, and it is the part that is impossible to eyeball.
 */
export function parseAcceptLanguage(header: string): AcceptLanguageEntry[] {
  return header
    .split(",")
    .map((part, index) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag.trim();

      let quality = 1;
      for (const param of params) {
        const [name, value] = param.split("=").map((piece) => piece?.trim().toLowerCase());
        if (name === "q") {
          const parsed = Number.parseFloat(value ?? "");
          // RFC 9110: q is 0..1 with at most three decimals. Anything else is
          // malformed, and malformed means "not stated" (q=1) rather than
          // "worst possible" (q=0) — a browser with a typo should not be
          // silently downgraded to the fallback.
          quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 1;
        }
      }

      return { tag, quality, index };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map(({ tag, quality }) => ({ tag, quality }));
}
