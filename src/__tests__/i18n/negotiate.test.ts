import { describe, expect, it } from "bun:test";
import { defaultLocale, locales } from "@/i18n/config";
import { negotiateLocale, parseAcceptLanguage } from "@/i18n/resolve";

/**
 * `Accept-Language` negotiation, which the proxy uses when a request carries no
 * usable `locale` cookie and then persists the result.
 *
 * The rules being pinned here are the ones real browsers exercise and that a
 * "first supported tag wins" implementation gets wrong. Each of these was a
 * plausible implementation that produced the wrong language.
 */

describe("parseAcceptLanguage", () => {
  it("orders by descending q-value, not by position", () => {
    // Taking the header in textual order answers "fr" here, which is wrong.
    const parsed = parseAcceptLanguage("fr;q=0.9,de;q=1.0,en;q=0.8");
    expect(parsed.map((entry) => entry.tag)).toEqual(["de", "fr", "en"]);
  });

  it("keeps header order within one quality band", () => {
    // Equal q means the client's own ordering is the preference, and a sort
    // that is not stable would reshuffle it.
    const parsed = parseAcceptLanguage("de,fr;q=1.0,en");
    expect(parsed.map((entry) => entry.tag)).toEqual(["de", "fr", "en"]);
  });

  it("treats a missing q as 1", () => {
    const parsed = parseAcceptLanguage("de;q=0.5,fr");
    expect(parsed[0]).toEqual({ tag: "fr", quality: 1 });
  });

  it("treats a malformed q as unstated rather than as zero", () => {
    // q=0 is an explicit refusal. A typo is not, and downgrading a browser to
    // the fallback because of a typo is a bug, not a safe default.
    const parsed = parseAcceptLanguage("de;q=nonsense,fr;q=0.2");
    expect(parsed[0]).toEqual({ tag: "de", quality: 1 });
  });

  it("ignores an out-of-range q", () => {
    expect(parseAcceptLanguage("de;q=5,fr;q=-1")[0].tag).toBe("de");
  });

  it("drops empty entries", () => {
    expect(parseAcceptLanguage("de,, ,fr").map((e) => e.tag)).toEqual(["de", "fr"]);
  });
});

describe("negotiateLocale", () => {
  it("returns null when no preference is expressed", () => {
    // Null rather than the default, so the caller can tell "no preference" from
    // "preference is English" and only write a cookie in the first case.
    expect(negotiateLocale(null)).toBeNull();
    expect(negotiateLocale(undefined)).toBeNull();
    expect(negotiateLocale("")).toBeNull();
  });

  it("returns null when nothing in the header is supported", () => {
    expect(negotiateLocale("xx-YY,zz")).toBeNull();
  });

  it("matches an exact supported locale", () => {
    expect(negotiateLocale("de")).toBe("de");
    expect(negotiateLocale("ar")).toBe("ar");
  });

  it("falls back from a regional tag to its base language", () => {
    // What a browser in Vienna, São Paulo or Taipei actually sends.
    expect(negotiateLocale("de-AT")).toBe("de");
    expect(negotiateLocale("pt-BR")).toBe("pt");
    expect(negotiateLocale("zh-Hant-TW")).toBe("zh");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(negotiateLocale("  DE-at , en;q=0.5")).toBe("de");
  });

  it("honours q ordering across regional and base tags", () => {
    expect(negotiateLocale("en-GB;q=0.9,de;q=0.95")).toBe("de");
    expect(negotiateLocale("de;q=0.95,en-GB;q=0.9")).toBe("de");
  });

  it("skips a language the client explicitly refuses", () => {
    // q=0 means "acceptable but not preferred" — RFC 9110 says it is not
    // acceptable, and browsers use it to exclude a language.
    expect(negotiateLocale("de;q=0,en;q=0.5")).toBe("en");
    expect(negotiateLocale("de;q=0")).toBeNull();
  });

  it("treats * as the default and not as a match for anything", () => {
    expect(negotiateLocale("*")).toBe(defaultLocale);
    expect(negotiateLocale("xx,*")).toBe(defaultLocale);
    // A real preference before the wildcard still wins.
    expect(negotiateLocale("fr,*;q=0.1")).toBe("fr");
  });

  it("prefers a supported language over an unsupported one listed first", () => {
    // Real Chrome sends the user's languages, which routinely include ones this
    // app has no catalogue for.
    expect(negotiateLocale("cy-GB,en-GB,en;q=0.9,en-US;q=0.8")).toBe("en");
  });

  it("agrees with itself on every supported locale", () => {
    for (const locale of locales) {
      expect(negotiateLocale(locale)).toBe(locale);
    }
  });

  it("is not fooled by a value that only shares a prefix", () => {
    // "de" is a prefix of "de-AT" but not the other way round, and neither is
    // a reason to accept an unrelated tag.
    expect(negotiateLocale("devilish")).toBeNull();
    expect(negotiateLocale("de-AT-extra")).toBe("de");
  });
});
