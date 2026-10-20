import { join } from "bun:path";
import { beforeAll, describe, expect, it } from "bun:test";

import { defaultLocale, locales } from "@/i18n/config";
import { IDENTIFIER_KEYS, LOCALES, isIdentifierKey, validate } from "../../../scripts/lib/catalogue-batch";

/**
 * `/donation` was the page that asked for money while displaying a fabricated
 * impact number and a tax claim the company could not support.
 *
 * This file pins the properties of the fix that a screenshot cannot see:
 *
 *  1. the `Donation` namespace is complete in all 21 locales, so a key landing
 *     in `en.json` alone cannot ship;
 *  2. the company registration number is byte-identical everywhere, because its
 *     entire purpose is to be looked up;
 *  3. no value is its own key path, which next-intl renders literally;
 *  4. no value in this namespace is English left in place — including the
 *     Latin-script locales, which the script rules cannot reach and which is
 *     the defect the `identical-to-english` rule was added for.
 *
 * Point 4 is the one that would have caught the original bug, and it is a
 * separate assertion rather than a side effect of point 1: every key exists in
 * every locale either way. The difference is the *value*.
 */

type Catalog = Record<string, Record<string, string>>;

const MESSAGES = join(process.cwd(), "messages");

/**
 * Every catalogue, read once.
 *
 * `Bun.file().json()` parses as it reads, and reading up front means the
 * per-locale lookups below are map hits rather than repeated I/O.
 */
const CATALOGUES = new Map<string, Catalog>(
  await Promise.all(
    locales.map(
      async (locale) => [locale, (await Bun.file(join(MESSAGES, `${locale}.json`)).json()) as Catalog] as const,
    ),
  ),
);

const read = (locale: string): Catalog => CATALOGUES.get(locale) ?? {};

const NAMESPACE = "Donation";

const english = read(defaultLocale)[NAMESPACE];
const byLocale = locales.map((locale) => [locale, read(locale)[NAMESPACE]] as const);

describe(`${NAMESPACE} namespace is complete in every locale`, () => {
  const keys = Object.keys(english);

  it("the namespace exists at all (an empty list of keys would pass vacuously)", () => {
    expect(keys.length).toBeGreaterThan(20);
  });

  it.each(locales)("%s has every key", (locale) => {
    const missing = keys.filter((key) => !(key in read(locale)[NAMESPACE]));
    expect({ locale, missing }).toEqual({ locale, missing: [] });
  });

  it.each(locales)("%s adds no key the reference does not have", (locale) => {
    // An extra key is dead weight that the per-locale budget then charges for,
    // and it is invisible in a locale whose other keys happen to be right.
    const extra = Object.keys(read(locale)[NAMESPACE] ?? {}).filter((key) => !(key in english));
    expect({ locale, extra }).toEqual({ locale, extra: [] });
  });
});

describe(`${NAMESPACE} identifiers survive translation`, () => {
  it.each(locales)("%s keeps the company registration number intact", (locale) => {
    // The trust indicator this replaced asked to be believed. A registration
    // number can be checked, which is why it is there — and transliterating it
    // into Cyrillic or Devanagari would make it unfindable, which is the
    // opposite of the point.
    const value = read(locale)[NAMESPACE].trust_registered;
    expect(value).toBe(english.trust_registered);
    expect(value).toContain("14023669");
  });

  it.each(locales)("%s names the payment provider the button links to", (locale) => {
    // "Ko-fi" is a trademark and is not translated in any locale, English
    // included. A locale that dropped it is pointing the reader somewhere else.
    //
    // `kofi_hero` only. `kofi_cta` is "Donate Now", which says nothing about
    // where the money goes — asserting on it was a mistake, because the second
    // button is the one a reader reaches for and it must stay short.
    expect(read(locale)[NAMESPACE].kofi_hero).toContain("Ko-fi");
  });

  it("holds every identifier key identical in all 21 locales", () => {
    // The exemption `check-catalogue` relies on. If this ever changes, the
    // exemption has to change with it, and this is what notices.
    expect([...IDENTIFIER_KEYS]).toEqual(["trust_registered"]);
    for (const key of IDENTIFIER_KEYS) {
      const values = new Set(byLocale.map(([, ns]) => ns[key]));
      expect({ key, distinct: values.size }).toEqual({ key, distinct: 1 });
    }
  });
});

describe(`${NAMESPACE} values are real translations`, () => {
  it("no value is its own key path", () => {
    // next-intl's getMessageFallback returns the key path, so this renders as
    // the literal string "Donation.cta_title" on the page.
    const offenders: string[] = [];
    for (const [locale, ns] of byLocale) {
      for (const key of Object.keys(english)) {
        const value = ns[key];
        if (value === key || value === `${NAMESPACE}.${key}`) offenders.push(`${locale}/${key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no non-English locale is left holding the English string", () => {
    // The rule that catches the class of defect this phase is about. It is
    // asserted here as well as in `check:catalogue` because a unit test is
    // where someone will look when a locale renders in English, and the gate is
    // a ratchet — a ratchet that has a hole in it is not a ratchet.
    const offenders: string[] = [];
    for (const key of Object.keys(english)) {
      // Held-identical on purpose — that is what makes it checkable.
      if (isIdentifierKey(key)) continue;
      const source = english[key];
      // One word of content: single words genuinely coincide across languages.
      const words = source
        .replace(/<[^>]*>|\{[^}]*\}/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (words.length < 2) continue;
      for (const [locale, ns] of byLocale) {
        if (locale === defaultLocale) continue;
        if (ns[key] === source) offenders.push(`${locale}/${key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("passes the catalogue validator for the namespaces this phase added", () => {
    // The four namespaces written in this phase, run through the same rules the
    // gate uses. Zero findings is the claim; the gate's baseline proves it is a
    // real one rather than an empty namespace skipping the checks.
    const batch: Record<string, Record<string, string>> = {};
    for (const namespace of ["Donation", "Privacy", "Terms", "Home"]) {
      const source = read(defaultLocale)[namespace];
      for (const key of Object.keys(source)) {
        batch[`${namespace}.${key}`] = Object.fromEntries(
          LOCALES.map((locale) => [locale, read(locale)[namespace]?.[key] ?? ""]),
        );
      }
    }
    expect(validate(batch).map((f) => `${f.key}/${f.locale} ${f.rule}`)).toEqual([]);
  });
});

describe("the measured impact stat is actually measured", () => {
  let page = "";

  beforeAll(async () => {
    page = await Bun.file(join(process.cwd(), "src", "app", "donation", "page.tsx")).text();
  });

  it("no numeric literal is rendered as a platform figure", () => {
    // The defect: `<h3>1,000+</h3>` typed into the page. `check-i18n-text` is
    // blind to it — the guard requires a letter, and "1,000+" has none — which
    // is why this assertion is here and not only in a script.
    const figures = page.match(/<\/?[A-Za-z][^>]*>\s*[\d][\d.,]*\+?\s*</g) ?? [];
    expect(figures).toEqual([]);
  });

  it("the one measured figure is read through getPublicStats", () => {
    // A guard that only bans the literal would be satisfied by deleting the
    // number; what matters is that a real count replaced it.
    expect(page).toContain("getPublicStats");
    expect(page).toContain('kind: "measured"');
  });

  it("a failed count removes the card rather than printing zero", () => {
    // The Phase 19 failure mode: a query that fails renders as a confident "0",
    // and on a donation page it is the one number a reader might act on.
    expect(page).toMatch(/kind !== "measured" \|\| stats/);
  });
});
