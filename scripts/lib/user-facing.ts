/**
 * What counts as user-facing English prose.
 *
 * Two guards ask the same question in two different syntactic positions —
 * `check-i18n-text.ts` looks at text between JSX tags, `check-i18n-attributes.ts`
 * looks at the value of `aria-label` and friends — and they must agree on the
 * answer. A copy of these rules in two files is a copy that drifts, and drift
 * here is silent: a guard that stops reporting is worse than a guard that never
 * existed, because the baseline says it is watching.
 *
 * So the rules live here, once, and each guard supplies only the context it
 * knows about: whether the node is inside an `<svg>`, and whether the value is a
 * whole element's text or a fragment of one.
 *
 * The rules were each added or narrowed because the check reported a string that
 * was already correct. That is the documented way a guard gets switched off, and
 * it has happened in this repo more than once — see the note on `PROPER_NOUN`
 * below, which in its first form matched "Save", "Share" and "Cancel" and so
 * silently forgave the single-word majority of what the guards exist to find.
 */

/** No letters, so nothing to translate: "123", "→", "/". */
export const HAS_LETTERS = /\p{L}/u;

/**
 * A single token shaped like a name rather than a word.
 *
 * Two versions of this were wrong, and both failed by *forgiving* — which is the
 * direction a guard's number cannot reveal, because the count just looks lower
 * and healthier.
 *
 * 1. `^\p{Lu}?\s*\p{Lu}\s*$` — an *optional* leading capital followed by
 *    another one — matches "Save", "Share" and "Cancel", so the single-word
 *    majority of what the guards exist to find was silently excluded.
 * 2. `[.-]` with no condition on its neighbours, which is what shipped in the
 *    version that ran against the real catalogue. Any word *ending* in a full
 *    stop or a hyphen matched: "Loading...", "Saving...", "Delete." — all
 *    forgivable, all English. A name has the separator with letters on **both**
 *    sides, which is what "Ko-fi" and "Next.js" have and what "Loading..." does
 *    not.
 *
 * So the separator now has to be interior, and the mid-word capital is the other
 * half — "GitHub", "iPhone", "YouTube".
 */
const NAMED_SHAPE = /(?<=[\p{L}\p{N}])[.-](?=[\p{L}\p{N}])|\S\p{Lu}[\p{Ll}\p{N}]/u;
const PROPER_NOUN = new RegExp(`^\\S*(?:${NAMED_SHAPE.source})\\S*$`, "u");

/** Purely symbolic: a fraction, a punctuation run. */
const SYMBOLIC = /^[\p{S}\p{N}\s/·.,:;()[\]{}<>|+\-–—*#"']+$/u;

/**
 * A keycap: symbols, digits and capitals only, and short.
 *
 * "⌘K" has a letter in it, so the symbolic rule does not catch it, and it is not
 * a name by shape either. Three characters of symbols-and-capitals is the shape of
 * a key hint, not a phrase. The bound matters: without it every all-caps word —
 * and every long symbol run — would be forgiven, and "ESC" is worth the same as
 * "NEW" not being reported.
 */
const KEYCAP = /^[\p{S}\p{N}\p{Lu}]{1,3}$/u;

/**
 * Words that are the same in every language, checked **word by word**.
 *
 * A whole-value check forgives "Ko-fi" and reports "FoodShare logo", which is
 * half right: the brand is not translatable and "logo" is. An attribute value is
 * usually exactly that shape — a brand or a trademark plus a noun — so the
 * per-word form is what makes `alt="FoodShare logo"` forgivable without also
 * forgiving `alt="FoodShare home"`… which is also fine, and is the point.
 *
 * Deliberately short, and every entry is a decision somebody had to make.
 */
const BORROWED = new Set([
  "foodshare",
  "ko-fi",
  "tarlan",
  "isaev",
  "ltd",
  "uk",
  "foodlytics",
  "google",
  "apple",
  "facebook",
  "github",
  "sentry",
  "supabase",
  "telegram",
  "twitter",
  "instagram",
  "linkedin",
  "mapbox",
  "stripe",
  "twilio",
  "resend",
  "mailgun",
  "aws",
  "seo",
  "crm",
  "api",
  "url",
  "id",
  "icon",
  "img",
  "image",
  "photo",
  "avatar",
  "logo",
  "qr",
  "code",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "mp4",
  "pdf",
  "csv",
  "xls",
  "xlsx",
  "css",
  "html",
  "json",
  "xml",
  "yaml",
  "sms",
  "email",
  "wifi",
  "gps",
  "pwa",
  "utc",
  "gmt",
  "iso",
]);

const word = (token: string) => token.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Every word in the value is a loanword, so the value is not English prose.
 *
 * Requires at least one word, and requires the value to contain nothing but
 * words and separators — a brand run joined to a sentence is prose with a brand
 * in it, and that is the case a guard most needs to report.
 */
const allBorrowedWords = (value: string): boolean => {
  if (/[.!?;]/.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean).map(word);
  return words.length > 0 && words.every((token) => BORROWED.has(token));
};

/**
 * Whether a string is user-facing English prose.
 *
 * `wholeValue` is `true` for a text node and for an attribute value, and `false`
 * only for a JSX fragment in the middle of a sentence. The difference is the
 * single-token proper-noun exemption: a standalone "GitHub" is a name, while the
 * word "GitHub" inside a sentence is part of prose that needs translating around
 * it. An attribute is never part of a longer sentence — `title` and `aria-label`
 * hold a complete label — so both guards pass `true` and the rule stays in one
 * place.
 */
export function isUserFacing(value: string, options: { insideSvg?: boolean; wholeValue?: boolean } = {}): boolean {
  const { insideSvg = false, wholeValue = true } = options;
  if (insideSvg) return false;
  if (!HAS_LETTERS.test(value)) return false;
  if (SYMBOLIC.test(value)) return false;
  if (KEYCAP.test(value)) return false;
  // Both exemptions below are for a value that *is* a label, not a word inside
  // one. A brand standing alone is a brand; the same word inside a sentence is
  // part of prose that has to be translated around it — and applying the
  // exemption in a fragment would forgive "Uploaded to FoodShare by Ada",
  // because every loanword-shaped token in it is a loanword.
  if (wholeValue) {
    if (allBorrowedWords(value)) return false;
    if (!value.includes(" ") && PROPER_NOUN.test(value)) return false;
  }
  return true;
}
