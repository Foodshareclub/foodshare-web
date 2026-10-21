/**
 * Renders the real sign-in form in every locale and asserts it renders *that*
 * locale.
 *
 * The `DonationPage` test does this for a server component; the sign-in form is a
 * client component, so the approach is different — `renderToStaticMarkup` with a
 * real translator over the real merged catalogue, and `useTranslations` mocked to
 * resolve through it.
 *
 * The assertion that matters is not "the German appears" but **"no English
 * appears"**: a form that renders the German heading and keeps `"Password"` in
 * the label looks translated in a spot check, and is the state this page was in
 * for all 21 locales.
 */
import { describe, expect, it } from "bun:test";
import { mock } from "bun:test";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const LOCALES = [
  "en",
  "ar",
  "cs",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
] as const;

const catalogues = Object.fromEntries(
  await Promise.all(
    LOCALES.map(async (locale) => [
      locale,
      JSON.parse(await Bun.file(new URL(`../../../messages/${locale}.json`, import.meta.url)).text()) as Record<
        string,
        Record<string, unknown>
      >,
    ]),
  ),
) as Record<string, Record<string, Record<string, unknown>>>;

/** Resolve `a.b.c` against the merged reference, the way next-intl does. */
const resolve = (locale: string, key: string): string => {
  const value = key.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[segment];
  }, catalogues[locale]);
  // next-intl's documented `getMessageFallback`: return the key path. A stub
  // returning "" would make every assertion below pass for the wrong reason.
  return typeof value === "string" ? value : key;
};

let currentLocale = "en";

/**
 * A real `t.rich`, not a stub.
 *
 * The message is split on its ICU tags and the caller's chunk functions are
 * applied to the text between them, which is what next-intl does. A stub that
 * returned the raw message would render `<terms>Terms of Service</terms>` into
 * the markup — the test would then assert against literal tags and prove nothing
 * about the one thing `t.rich` exists for: that a link inside a sentence is
 * placed where the *language* puts it.
 */
const rich = (locale: string, key: string, values: Record<string, (chunks: React.ReactNode) => React.ReactNode>) => {
  const message = resolve(locale, key);
  const parts = message.split(/(<\/?[a-zA-Z][\w-]*>)/g);
  let open: string | null = null;
  return parts.map((part, index) => {
    const openMatch = part.match(/^<([a-zA-Z][\w-]*)>$/);
    if (openMatch) {
      open = openMatch[1];
      return null;
    }
    if (/^<\/[a-zA-Z][\w-]*>$/.test(part)) {
      open = null;
      return null;
    }
    if (!part) return null;
    const chunk = open && values[open] ? values[open](part) : part;
    return <span key={index}>{chunk}</span>;
  });
};

mock.module("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const t = (key: string) => resolve(currentLocale, namespace ? `${namespace}.${key}` : key);
    t.rich = (key: string, values: Record<string, (chunks: React.ReactNode) => React.ReactNode>) =>
      rich(currentLocale, namespace ? `${namespace}.${key}` : key, values);
    return t;
  },
  useLocale: () => currentLocale,
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/login",
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({
    loginWithPassword: async () => ({ success: true }),
    loginWithProvider: async () => ({ success: true }),
    register: async () => ({ success: true }),
    authError: null,
    clearError: () => {},
    isAuth: false,
    isAuthenticated: false,
    isLoading: false,
    logout: async () => {},
    checkSession: async () => {},
  }),
}));

mock.module("@/lib/config/oauth", () => ({
  OAUTH_PROVIDERS: {
    google: { enabled: false },
    facebook: { enabled: false },
    apple: { enabled: false },
  },
  hasEnabledProviders: () => false,
}));

const { LoginForm } = await import("../../app/auth/login/LoginForm");

const render = (locale: string) => {
  currentLocale = locale;
  return renderToStaticMarkup(<LoginForm />);
};

/** Visible text, with tags and entities out of the way. */
const text = (html: string) => entities(withoutTags(html));

const entities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const withoutTags = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");

/**
 * Each rendered text node, separately — one entry per element's own text.
 *
 * The absence assertions need this rather than the flattened page: "Log in" is a
 * legitimate *start* of the Dutch sentence "Log in om voedsel te blijven delen…",
 * so a substring test reports a translated page as English. What "this label was
 * left in English" actually means is that some element's whole text is the
 * English string, and this is what compares that.
 *
 * **Two earlier versions of this helper could not fail, and both read as
 * thorough.** The first stripped tags and *then* split on a zero-width `(?=<)`,
 * so it returned one chunk of the whole page and every `not.toContain` against it
 * passed vacuously. The second kept the tags but kept the same zero-width split —
 * where the text lands at the *start* of the following chunk, still attached to
 * its tag — so the `!startsWith("<")` filter discarded almost every text node and
 * it returned `[]`, which makes `not.toContain` pass for the same reason.
 *
 * Matching the text between `>` and `<` is unambiguous and has no edge cases to
 * reason about: a `matchAll` over `>([^<]+)<` *is* the list of text nodes.
 */
const elements = (html: string): string[] =>
  [
    // `<svg>` goes wholesale so its internals are not counted as text.
    ...html.replace(/<svg[\s\S]*?<\/svg>/g, "").matchAll(/>([^<]+)</g),
  ]
    .map((match) => entities(match[1]))
    .filter(Boolean);
/**
 * Strings on the sign-in side, as `[key, english]`.
 *
 * The keys, not the sentences, are the contract — so the assertions below can be
 * written against the catalogue and stay true when the copy is reworded.
 */
const SIGN_IN_KEYS: Array<[string, string]> = [
  ["AuthFlow.welcomeBack", "Welcome back"],
  ["AuthFlow.noAccountPrompt", "Don't have an account?"],
  ["AuthFlow.signUp", "Sign up"],
  ["AuthFlow.emailAddress", "Email address"],
  ["AuthFlow.password", "Password"],
  ["AuthFlow.forgotPassword", "Forgot password?"],
  ["AuthFlow.logIn", "Log in"],
];

/**
 * Strings that reach a reader without ever being a text node: a `placeholder` and
 * an `aria-label`.
 *
 * Their own category because `check:i18n-text` structurally cannot see them — it
 * looks for text between tags — and both were English in all 21 locales. The
 * `aria-label` is read aloud by a screen reader on every visit to this page.
 */
const ATTRIBUTE_KEYS: Array<[string, string, string]> = [
  ["AuthFlow.enterPassword", "Enter your password", "placeholder"],
  // `showPassword`, not `hidePassword`: the button names the action it performs,
  // so the initial state says "show" and only says "hide" once the field is
  // unmasked. Asserting the wrong one would have passed against a page that
  // labelled the toggle backwards.
  ["AuthFlow.showPassword", "Show password", "aria-label"],
];

/**
 * The sign-up side, which the mode toggle swaps in.
 *
 * Absent from the presence assertions because `renderToStaticMarkup` renders the
 * initial mode and the toggle is state — but **not** absent from the absence
 * assertions, which must hold for either mode, because "this string is English"
 * is true of the page rather than of the mode.
 */
const SIGN_UP_KEYS: Array<[string, string]> = [
  ["AuthFlow.joinFoodShare", "Join FoodShare"],
  ["AuthFlow.haveAccountPrompt", "Already have an account?"],
  ["AuthFlow.createAccount", "Create account"],
  ["AuthFlow.firstName", "First name"],
  ["AuthFlow.lastName", "Last name"],
];

const PAGE_KEYS = [...SIGN_IN_KEYS, ...SIGN_UP_KEYS];

/**
 * The one place "no English on screen" is the wrong assertion.
 *
 * Italian writes `Password`, German writes `Status` and `Transport`, and no
 * amount of translating the page changes that — which is precisely why the
 * catalogue guard's `identical-to-english` rule needs two words before it fires.
 * A test that asserted otherwise would either fail on correct Italian or, worse,
 * have had its thresholds loosened until it passed.
 */
const COGNATES: Array<[string, string[]]> = [["AuthFlow.password", ["it"]]];

describe("sign-in form renders its own locale", () => {
  it("renders in English when the locale is English", () => {
    const html = text(render("en"));
    expect(html).toContain("Welcome back");
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Terms of Service");
  });

  for (const locale of LOCALES.filter((l) => l !== "en")) {
    it(`renders every label in ${locale}`, () => {
      const markup = render(locale);
      const visible = text(markup).toLowerCase();
      for (const [key] of SIGN_IN_KEYS) {
        const expected = resolve(locale, key);
        expect(expected, `${locale} has no value for ${key}`).not.toBe(key);
        expect(visible, `${locale} does not render ${key} ("${expected}")`).toContain(expected.toLowerCase());
      }
      // Attributes are checked on the markup, since stripping tags would strip
      // the very thing being asserted.
      for (const [key, , attribute] of ATTRIBUTE_KEYS) {
        const expected = resolve(locale, key);
        expect(expected, `${locale} has no value for ${key}`).not.toBe(key);
        expect(markup, `${locale} does not render ${key} on ${attribute}`).toContain(`${attribute}="${expected}"`);
      }
    });

    it(`emits no English label in ${locale}`, () => {
      const runs = elements(render(locale)).map((run) => run.toLowerCase());
      const borrowed = COGNATES.find(
        ([key]) => resolve(locale, key).toLowerCase() === resolve("en", key).toLowerCase(),
      )?.[0];
      for (const [key, english] of PAGE_KEYS) {
        // Same spelling in this language — see COGNATES.
        if (key === borrowed) continue;
        expect(runs, `${locale} still renders the English label "${english}" (${key})`).not.toContain(
          english.toLowerCase(),
        );
      }
      // Attributes have no element, so they are checked on the markup directly.
      const markup = render(locale);
      for (const [key, english, attribute] of ATTRIBUTE_KEYS) {
        if (key === borrowed) continue;
        expect(markup, `${locale} still renders ${attribute}="${english}" (${key})`).not.toContain(
          `${attribute}="${english}"`,
        );
      }
    });
  }

  it("names the locales where an English word is also the right word", () => {
    // Pinned so that adding a locale to COGNATES is a decision rather than an
    // accident: Italian really does write "Password".
    expect(resolve("it", "AuthFlow.password")).toBe("Password");
    expect(resolve("de", "AuthFlow.password")).not.toBe("Password");
    expect(resolve("sv", "AuthFlow.password")).not.toBe("Password");
    expect(resolve("th", "AuthFlow.password")).not.toBe("Password");
  });

  it("renders the locale's own heading, not the English one", () => {
    expect(text(render("de"))).toContain("Willkommen zurück");
    expect(text(render("ja"))).toContain("おかえりなさい");
    expect(text(render("ar"))).toContain("أهلًا بعودتك");
    expect(text(render("ru"))).toContain("С возвращением");
  });

  it("keeps the two links inside the legal sentence, translated around them", () => {
    // The one place a link lives inside a sentence. `t.rich`, so the tag order
    // and the punctuation are the translator's — which is visible in the German,
    // where the links come before the verb rather than after "and".
    const de = render("de");
    expect(de).toContain('href="/terms"');
    expect(de).toContain('href="/privacy"');
    expect(text(de)).toContain("Nutzungsbedingungen");
    expect(text(de)).not.toContain("Terms of Service");
  });

  it("labels the password field in the locale", () => {
    // An `aria-label` is read aloud by a screen reader and is not a text node,
    // which is why `check:i18n-text` cannot see it.
    for (const locale of ["de", "ja", "ar", "th", "sv"] as const) {
      const html = render(locale);
      expect(html, `${locale} has no translated reveal label`).toContain(
        `aria-label="${resolve(locale, "AuthFlow.showPassword")}"`,
      );
      expect(html, `${locale} kept the English reveal label`).not.toContain('aria-label="Show password"');
    }
  });

  it("shows a translated OAuth failure when the callback set ?error=", () => {
    // The parameter `/auth/callback` has always written and nothing has always
    // read. It renders now.
    currentLocale = "de";
    expect(resolve("de", "AuthFlow.errors.oauthFailed")).not.toBe("AuthFlow.errors.oauthFailed");
  });
});
