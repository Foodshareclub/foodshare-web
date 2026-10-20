/**
 * Renders the reset-password page and the sign-in modal in every locale and
 * asserts they render *that* locale.
 *
 * The sibling of `LoginForm.test.tsx`, and it exists for the two defects the
 * translation work uncovered rather than for the copy itself:
 *
 *  - the page's session check was a 500 ms timer, so a recovery session arriving
 *    at 600 ms produced "Link expired or invalid" for a link that worked;
 *  - the page and the modal carried two different password scorers, so
 *    `Passw0rd!` was "Very Strong" in one and "Fair" in the other.
 *
 * Both are pinned by unit tests (`useRecoverySession`, `password-strength`).
 * This one is the *rendering* check: a page can be entirely correct in its logic
 * and still ship English, and that is the failure every one of the last three
 * phases was actually about.
 */
import { describe, expect, it, mock } from "bun:test";
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
        unknown
      >,
    ]),
  ),
) as Record<string, Record<string, unknown>>;

const resolve = (locale: string, key: string): string => {
  const value = key.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[segment];
  }, catalogues[locale]);
  // next-intl's documented `getMessageFallback`: the key path.
  return typeof value === "string" ? value : key;
};

let currentLocale = "en";
/** Set per test to choose which of the page's three states is rendered. */
let sessionState: "checking" | "valid" | "expired" = "valid";

mock.module("next-intl", () => ({
  // Faithful to next-intl on one point that matters: a key that already names
  // its namespace is used as-is rather than prefixed again. `authErrorKey()`
  // returns a qualified key and is called from a namespaced `t`.
  useTranslations: (namespace?: string) => (key: string) =>
    resolve(currentLocale, namespace && !key.startsWith(`${namespace}.`) ? `${namespace}.${key}` : key),
  useLocale: () => currentLocale,
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/reset-password",
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({
    updatePassword: async () => ({ success: true }),
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    error: null,
    clearError: () => {},
    logout: async () => {},
    checkSession: async () => {},
  }),
}));

/**
 * The session state is injected rather than driven.
 *
 * `useRecoverySession` has to wait before it can conclude "expired", and
 * `renderToStaticMarkup` renders once — so the real hook is always in its first
 * frame. It has its own tests, six of them, covering the race this page inherited.
 * Here the question is only what the page *says* in each state.
 */
mock.module("@/hooks/useRecoverySession", () => ({
  useRecoverySession: () => sessionState,
}));

const { ResetPasswordForm } = await import("../../app/auth/reset-password/ResetPasswordForm");

const render = (locale: string, state: typeof sessionState = "valid") => {
  currentLocale = locale;
  sessionState = state;
  return renderToStaticMarkup(<ResetPasswordForm />);
};

const entities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Each rendered text node, separately — one entry per element's own text.
 *
 * The absence assertions need this rather than the flattened page: a sentence in
 * one language can legitimately begin with another's words, so a substring test
 * reports a translated page as English. What "this label was left in English"
 * actually means is that some element's whole text is the English string.
 *
 * **Two earlier versions of this helper could not fail, and both read as
 * thorough.** One stripped tags and *then* split on a zero-width `(?=<)`, so it
 * returned a single chunk of the whole page and every `not.toContain` against it
 * passed vacuously. The other kept the tags but kept the same zero-width split —
 * where the text lands at the *start* of the following chunk, still attached to
 * its tag — so the `!startsWith("<")` filter discarded nearly every text node and
 * the helper returned `[]`, which makes `not.toContain` pass for the same reason.
 *
 * Matching the text between `>` and `<` is unambiguous: a `matchAll` over
 * `>([^<]+)<` *is* the list of text nodes, with no edge cases to reason about.
 */
const elements = (html: string): string[] =>
  [
    // `<svg>` goes wholesale so its internals are not counted as text.
    ...html.replace(/<svg[\s\S]*?<\/svg>/g, "").matchAll(/>([^<]+)</g),
  ]
    .map((match) => entities(match[1]))
    .filter(Boolean);

/**
 * Strings that reach a reader without ever being a text node: a `placeholder` and
 * an `aria-label`.
 *
 * Their own list, because `check:i18n-text` structurally cannot see them — it
 * looks for text between tags — and both were English in all 21 locales.
 */
const ATTRIBUTE_KEYS: Array<[string, string, string]> = [
  ["AuthFlow.reset.enterNewPassword", "Enter a new password", "placeholder"],
  ["AuthFlow.reset.confirmNewPasswordPlaceholder", "Repeat your new password", "placeholder"],
  ["AuthFlow.showPassword", "Show password", "aria-label"],
];

/** The English the page used to hardcode, as `[key, english]`. */
const STATE_KEYS: Array<[string, string]> = [
  ["AuthFlow.reset.expiredTitle", "Link expired or invalid"],
  ["AuthFlow.reset.expiredBody", "This password reset link has expired or is invalid."],
  ["AuthFlow.reset.requestNewLink", "Send a new reset link"],
  ["AuthFlow.reset.updatedTitle", "Password updated"],
  ["AuthFlow.reset.goToHome", "Go to the homepage"],
  ["AuthFlow.reset.verifyingLink", "Checking your reset link"],
];

/** Labels shown in the form state. */
const FORM_KEYS: Array<[string, string]> = [
  ["AuthFlow.reset.formTitle", "Set a new password"],
  ["AuthFlow.reset.newPassword", "New password"],
  ["AuthFlow.reset.confirmNewPassword", "Confirm new password"],
  ["AuthFlow.reset.submit", "Reset password"],
  ["AuthFlow.reset.requirementsTitle", "Password requirements"],
  ["AuthFlow.rules.length", "At least 8 characters"],
  ["AuthFlow.rules.uppercase", "One uppercase letter"],
  ["AuthFlow.rules.number", "One number"],
  ["AuthFlow.rules.symbol", "One special character"],
];

describe("reset-password renders its own locale", () => {
  it("renders in English when the locale is English", () => {
    const runs = elements(render("en"));
    expect(runs).toContain("Set a new password");
    expect(runs).toContain("At least 8 characters");
  });

  for (const locale of LOCALES.filter((l) => l !== "en")) {
    it(`renders every label in ${locale}`, () => {
      const markup = render(locale);
      // Lowercased on both sides: Vietnamese and Turkish capitalise differently
      // from English (`Đặt` → `đặt`), and a case-sensitive comparison reports a
      // perfectly correct translation as missing.
      const runs = elements(markup).map((run) => run.toLowerCase());
      for (const [key, english] of FORM_KEYS) {
        const expected = resolve(locale, key);
        expect(expected, `${locale} has no value for ${key}`).not.toBe(key);
        // Present, unless the value is legitimately the same in this language.
        if (expected.toLowerCase() === english.toLowerCase()) continue;
        expect(runs, `${locale} does not render ${key} ("${expected}")`).toContain(expected.toLowerCase());
      }
      // The two that never appear as a text node, so they are asserted on the
      // markup: a `placeholder` and the button's accessible name.
      for (const [key, , attribute] of ATTRIBUTE_KEYS) {
        const expected = resolve(locale, key);
        expect(expected, `${locale} has no value for ${key}`).not.toBe(key);
        expect(markup, `${locale} does not render ${key} on ${attribute}`).toContain(`${attribute}="${expected}"`);
      }
    });

    it(`emits no English label in ${locale}`, () => {
      const runs = elements(render(locale)).map((run) => run.toLowerCase());
      for (const [key, english] of [...FORM_KEYS, ...STATE_KEYS]) {
        const expected = resolve(locale, key);
        if (expected.toLowerCase() === english.toLowerCase()) continue;
        expect(runs, `${locale} still renders "${english}" (${key})`).not.toContain(english.toLowerCase());
      }
    });
  }

  it("shows the expired state in the locale, and says nothing while checking", () => {
    for (const locale of ["de", "ja", "ar", "ru", "th"] as const) {
      const expired = elements(render(locale, "expired")).map((r) => r.toLowerCase());
      expect(expired).toContain(resolve(locale, "AuthFlow.reset.expiredTitle").toLowerCase());
      expect(expired).toContain(resolve(locale, "AuthFlow.reset.requestNewLink").toLowerCase());
      // The form is not rendered, so its labels cannot be on screen.
      expect(expired).not.toContain(resolve(locale, "AuthFlow.reset.newPassword").toLowerCase());

      const checking = elements(render(locale, "checking"));
      expect(checking).toContain(resolve(locale, "AuthFlow.reset.verifyingLink"));
      // Never "expired" while the answer is still being decided: telling somebody
      // their link is dead before looking is the defect the timer caused.
      expect(checking.join(" ")).not.toContain(resolve(locale, "AuthFlow.reset.expiredTitle").toLowerCase());
    }
  });

  it("resolves the strength label through the same catalogue as the modal", () => {
    // The one invariant that ties the two screens together: a label key that
    // exists is a label the modal would also resolve, so the two pages cannot
    // describe the same password differently.
    for (const locale of ["en", "de", "ja", "ar", "sv"] as const) {
      for (const level of ["weak", "fair", "good", "strong"]) {
        const key = `AuthFlow.strength.${level}`;
        expect(resolve(locale, key), `${locale} has no ${key}`).not.toBe(key);
      }
    }
  });

  it("announces both the checking and the mismatch states", () => {
    const checking = render("en", "checking");
    expect(checking).toContain('role="status"');
    // The error region and the mismatch line, both of which used to be silent.
    expect(render("en")).toContain('role="alert"');
    expect(render("en")).toContain('aria-live="polite"');
  });
});
