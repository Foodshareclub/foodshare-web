import { describe, expect, test } from "bun:test";
import { locales } from "@/i18n/config";
import { generatePageMetadata, openGraphLocale } from "@/lib/metadata";

describe("openGraphLocale", () => {
  test("covers every locale the app ships", () => {
    // Adding a language means choosing the territory OpenGraph will advertise
    // for it. Without this the new locale would silently fall back to en_US,
    // and social scrapers would describe a page in the wrong language while
    // everything else about it looked correct.
    const unmapped = locales.filter((locale) => openGraphLocale(locale) === "en_US" && locale !== "en");

    expect(unmapped).toEqual([]);
  });

  test("emits OpenGraph's language_TERRITORY form", () => {
    for (const locale of locales) {
      const value = openGraphLocale(locale);

      expect(value).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  test("falls back to en_US rather than throwing", () => {
    expect(openGraphLocale(undefined)).toBe("en_US");
    expect(openGraphLocale("")).toBe("en_US");
    expect(openGraphLocale("xx")).toBe("en_US");
  });

  test("a caller without a locale is unchanged from the old hardcoding", () => {
    const { openGraph } = generatePageMetadata({ title: "T", description: "D" });

    expect(openGraph?.locale).toBe("en_US");
  });

  test("a caller's locale reaches the OpenGraph block", () => {
    const { openGraph } = generatePageMetadata({ title: "T", description: "D", locale: "ja" });

    expect(openGraph?.locale).toBe("ja_JP");
  });
});
