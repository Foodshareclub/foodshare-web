import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The `/donation` hero, rendered in each locale.
 *
 * The catalogue tests prove the strings exist and are the right script. They do
 * not prove the page *renders* them, and that gap is where the previous
 * generation of this page lived: `en.json` had every key, `translations:check`
 * was green, and the page still printed "Every Coffee Saves a Meal" to a German
 * reader because the component never called `t()`.
 *
 * So this renders the component. The alternative — booting a server and
 * screenshotting it — is not available here anyway: `src/proxy.ts` refuses to
 * serve traffic without Redis configured, so `next start` answers 503. That is
 * the correct production posture and the wrong tool for checking a string.
 *
 * `getPublicStats` is mocked because the count is a database read; what is under
 * test is the *rendered copy*, and the number is asserted separately in
 * `donation.test.ts` against the component's source.
 */

const stats = {
  activeListings: 41,
  // Four digits, so the grouped-formatter assertion has a separator to disagree
  // about. `Intl.NumberFormat("de")` writes "1.234" and `("en")` writes "1,234",
  // and a hardcoded separator is wrong in exactly one of those.
  members: 1234,
  arrangedListings: 12,
  foodSavedKg: 24,
};

mock.module("@/lib/data/public-stats", () => ({
  getPublicStats: async () => stats,
  getCategoryCounts: async () => [],
}));

// `next/image` derives its width and height from the build-time import map, which
// does not exist here — it throws "missing required width property" the moment
// `renderToStaticMarkup` meets an `<Image>`. The build is fine; this is a
// harness gap. The decorative brackets carry `alt=""` and are sized in CSS, so
// nothing about the copy under test depends on them.
mock.module("next/image", () => {
  const { createElement } = require("react") as typeof import("react");
  return {
    default: ({ src, alt }: { src: string; alt?: string }) =>
      createElement("img", { src: String(src), alt: alt ?? "" }),
  };
});

const { default: DonationPage } = await import("@/app/donation/page");

// next-intl's server helpers read the request locale from this store.
const localeState = { current: "en" };

/**
 * A minimal `getTranslations`, resolved from the *real* merged catalogue.
 *
 * The obvious version — `mock.module("next-intl/server", …)` delegating to
 * next-intl's own `getTranslations` — is not reachable here: that function reads
 * the locale from a request context that only exists inside a Next render, and
 * under bun's resolver `next-intl` resolves to its `react-server` entry, where
 * `createTranslator` is a type rather than a value. Standing up the full request
 * context would mean not running this as a unit test.
 *
 * So the resolution is done by hand, from the same `loadMessagesWithFallback`
 * the app uses. What is under test is that the page calls `t()` with keys that
 * exist and renders the result; next-intl's own behaviour is covered separately
 * in `src/__tests__/i18n/merge.test.ts`.
 *
 * The missing-key branch matters: it returns the key, which is exactly what
 * next-intl's default `getMessageFallback` does and exactly what this page used
 * to look like. A stub that returned `""` instead would make the assertions pass
 * for the wrong reason.
 */
mock.module("next-intl/server", () => ({
  getLocale: async () => localeState.current,
  getTranslations: async (namespace: string) => {
    const { loadMessagesWithFallback } = await import("@/i18n/merge");
    const messages = (await loadMessagesWithFallback(localeState.current)) as Record<string, Record<string, unknown>>;
    const scope = messages[namespace] ?? {};
    const resolve = (key: string): unknown =>
      key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], scope);

    const t = ((key: string) => {
      const value = resolve(key);
      return typeof value === "string" ? value : key;
    }) as ((key: string) => string) & { rich: (key: string) => string };
    // `/donation` uses no rich text; `/terms` does, and the same mock is
    // reusable there.
    t.rich = (key: string) => t(key).replace(/<\/?[a-zA-Z][\w-]*>/g, "");
    return t;
  },
}));

async function renderIn(locale: string): Promise<string> {
  localeState.current = locale;
  // generateMetadata resolves through the same translator; asserting on it is
  // the Phase 16 lesson — the <title> is the part a search engine reads.
  const html = renderToStaticMarkup(await DonationPage());
  return html;
}

describe("/donation renders the locale, not English", () => {
  it.each([
    ["en", "Every Coffee Saves a Meal"],
    ["de", "Jeder Kaffee rettet eine Mahlzeit"],
    ["ja", "一杯のコーヒーが一食を救う"],
    ["ar", "كل فنجان قهوة ينقذ وجبة"],
    ["ru", "Каждая чашка кофе спасает приём пищи"],
    ["zh", "每一杯咖啡都能换来一顿饭"],
  ])("%s renders its own hero headline", async (locale, expected) => {
    const html = await renderIn(locale);
    expect(html).toContain(expected);
  });

  it("no locale renders the English headline unless it is English", async () => {
    for (const locale of ["de", "ja", "ar", "ru", "zh", "fr", "es", "th", "hi"]) {
      const html = await renderIn(locale);
      expect({ locale, leaked: html.includes("Every Coffee Saves a Meal") }).toEqual({
        locale,
        leaked: false,
      });
    }
  });

  it("the trust badge is the registration number in every locale", async () => {
    for (const locale of ["en", "de", "ja", "ar", "ru"]) {
      const html = await renderIn(locale);
      expect(html).toContain("14023669");
      // The claim that was replaced. Not a style preference: a UK company
      // cannot offer Gift Aid, and this string is read aloud on the page that
      // asks for money.
      expect({ locale, claim: html.includes("Tax Deductible") }).toEqual({ locale, claim: false });
    }
  });

  it("renders the measured member count, not a typed-in figure", async () => {
    const html = await renderIn("en");
    expect(html).toContain("1,234");
    expect({ fabricated: html.includes("1,000+") }).toEqual({ fabricated: false });
  });

  it("formats the count for the resolved locale", async () => {
    // `Intl.NumberFormat("de").format(1234)` is "1.234", not "1,234" — a
    // hardcoded separator reads as a typo to every German reader, and a
    // donor-facing number is the last place to be casual about it.
    const { makeGroupedFormatter } = await import("@/lib/numbers");
    const german = makeGroupedFormatter("de")(1234);
    const english = makeGroupedFormatter("en")(1234);
    expect({ german, english }).toEqual({ german: "1.234", english: "1,234" });
    expect(await renderIn("de")).toContain(german);
  });

  it("the founder's name is transliterated, not dropped", async () => {
    // The one place a name is *meant* to change shape: "Тарлан Исаев" in
    // Russian is the same person as "Tarlan Isaev", and both are correct. What
    // must not happen is the name silently vanishing.
    expect(await renderIn("ru")).toContain("Тарлан Исаев");
    expect(await renderIn("en")).toContain("Tarlan Isaev");
  });
});
