/**
 * Catalogue integrity: the checks a translation batch must pass before it is
 * installed.
 *
 * Phase 21 found two real defects by reading the catalogue by hand — an English
 * *thereby* inside an Arabic sentence, and `RELATED热衷penipuan` in `id`, which
 * is latin, a stray CJK glyph and an Indonesian word spliced into one token.
 * Neither is visible to a build, to `tsc`, to a budget or to the test suite: a
 * machine translation and a human one are both "a non-empty string" to
 * everything the repo can check. The permanent gate is
 * `scripts/check-catalogue.ts`; this module is the same rules as functions, so
 * the installer that writes a batch cannot skip them.
 */
import { join } from "bun:path";

export const LOCALES = [
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
];

/** The reference locale. A value equal to it elsewhere is a copy, not a translation. */
export const defaultLocale = "en";

export type Row = Record<string, string>;
export type Namespace = Record<string, Row>;

/**
 * Values that are a registry identifier rather than prose, and so must be
 * byte-identical in every locale. A company number exists to be looked up;
 * transliterating it would make it un-findable, which is the opposite of its
 * purpose.
 */
export const IDENTIFIER_KEYS = new Set(["trust_registered"]);

/**
 * Whether a key is one of the held-identifier values.
 *
 * Matches on the last dotted segment as well as the whole key, so the exemption
 * follows the key when a caller namespaces it — a test flattening four
 * namespaces into one map passes `Donation.trust_registered`, and an exemption
 * that only matched the bare name would not apply and the value would be
 * reported as untranslated in twenty locales.
 */
export const isIdentifierKey = (key: string): boolean =>
  IDENTIFIER_KEYS.has(key) || IDENTIFIER_KEYS.has(key.slice(key.lastIndexOf(".") + 1));

/** The script each locale's prose is expected to be written in. */
export const SCRIPT: Record<string, RegExp> = {
  ru: /\p{Script=Cyrillic}/u,
  uk: /\p{Script=Cyrillic}/u,
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  ja: /\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u,
  ko: /\p{Script=Hangul}/u,
  zh: /\p{Script=Han}/u,
  th: /\p{Script=Thai}/u,
};

/**
 * The allowlist token, with attached punctuation removed.
 *
 * The Latin-run matcher is built from a character class that includes the full
 * stop, apostrophe, right single quote and hyphen, so it captures the
 * punctuation that trails a word as part of the word: "FoodShare." in a Russian
 * sentence comes back as one token with a full stop on the end. Comparing that
 * against the allowlist misses, and the finding is nonsense — the sentence is
 * correct Russian and the brand is correctly spelled.
 *
 * So the trailing full stop, apostrophe, right single quote and hyphen are
 * stripped before the lookup, at both places the list is consulted. Stripping
 * *before* the comparison rather than after is what keeps the rule honest: an
 * allowlist entry is a word, and the brand is a word whether or not a sentence
 * happens to end there.
 */
const core = (token: string): string => token.replace(/[.'’-]+$/u, "");

/**
 * Latin runs that may appear inside a non-Latin value: a brand, a company, a
 * product, or a technical term the target language does not translate.
 *
 * Deliberately short, and every entry is a decision somebody had to make. Each
 * was added because the check reported a string that was already correct —
 * a guard that reports correct code is a guard that gets switched off.
 *
 *   foodshare/ko-fi/tarlan/isaev  brand and legal entity, spelled identically
 *                                 in every locale so it stays findable
 *   ltd/uk                        part of a registered company name
 *   foodlytics                    the product's own name; it is not translated
 *                                 in any locale, including English
 *   cookie                        Russian, Ukrainian, Japanese and Chinese all
 *                                 write the technical term in Latin script; the
 *                                 transliterations (куки, クookie) are not the
 *                                 forms a reader would recognise
 */
export const ALLOWED_LATIN = new Set([
  "foodshare",
  "ko-fi",
  "tarlan",
  "isaev",
  "ltd",
  "uk",
  "cookie",
  "cookies",
  "foodlytics",
  // Sign-in providers. Every locale writes these three the same way, because
  // they are trademarked names and a localised rendering is a different name.
  "apple",
  "facebook",
  "google",
  // A loanword Japanese has fully adopted; "Web" is not a transliteration there.
  "web",
]);

/**
 * Units of measure, stripped before the script check.
 *
 * SI symbols are the same in every locale precisely so a document mixing scripts
 * stays unambiguous — translating "km" or "kg" would be wrong, not inclusive.
 *
 * Split in two because of ambiguity. The two-letter and symbol forms are
 * recognisable on their own, so a bare one is stripped even after an ICU
 * argument has been blanked (`{distance} km以内`). The single-letter forms
 * collide with ordinary words in half these languages — "m", "t", "g" and "l"
 * are not distinguishable from a pronoun or an article — so those are only
 * stripped when a number is still in front of them.
 */
const UNIT_ALWAYS = /\b(?:km|kg|mg|ml|cm|mm|°c|°f|%)\b/giu;
const UNIT_AFTER_NUMBER = /\b\d[\d.,]*\s*(?:km|kg|mg|ml|cm|mm|m²|m³|m|t|g|l|°c|°f|%)\b/giu;

/** Email addresses and hostnames: `support@foodshare.club` is not prose. */
const ADDRESS = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;
const HOSTNAME = /\b(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|club|org|net|io|co|app|dev|kiwi)\b/gu;

/** The URL/placeholder forms that legitimately carry Latin inside any script. */
const LATIN_RUN_OK = /^(?:https?|www|@|#)[^\s]*$/;

/**
 * ICU rich-text tags, and the arguments of a message.
 *
 * Both are markup, not prose. `privacy_link` carries `<privacy>…</privacy>`
 * in every one of the 21 locales, so a script check that does not strip tags
 * reports a correct Russian message as containing the English word "privacy"
 * eight times over — which is how a guard gets switched off.
 */
const ICU_TAG = /<\/?[a-zA-Z][\w-]*>/g;
const ICU_ARGUMENT = /\{[A-Za-z_][\w]*\s*(?:,\s*(?:plural|select|selectordinal|number|date|time)\b)?[^}]*\}/g;

const markup = (value: string): string =>
  value.replace(ICU_TAG, " ").replace(ICU_ARGUMENT, " ").replace(ADDRESS, " ").replace(HOSTNAME, " ");

export interface Finding {
  key: string;
  locale: string;
  rule: string;
  detail: string;
}

const HAS_LETTER = /\p{L}/u;

const truncate = (value: string): string => (value.length > 72 ? `${value.slice(0, 72)}…` : value);

export function validate(ns: Namespace, label = ""): Finding[] {
  const findings: Finding[] = [];
  const keys = Object.keys(ns);
  const add = (key: string, locale: string, rule: string, detail: string) =>
    findings.push({ key, locale, rule, detail });
  /**
   * The value, or null if it is not usable as prose.
   *
   * The catalogue is not uniformly strings — a handful of leaves are numbers or
   * booleans, and a rule that assumed `.match` existed would throw on the first
   * of them rather than reporting anything.
   */
  const str = (key: string, locale: string): string | null => {
    const value = ns[key]?.[locale];
    return typeof value === "string" ? value : null;
  };

  for (const key of keys) {
    const row = ns[key];
    for (const locale of LOCALES) {
      const value = row[locale];
      if (typeof value !== "string" || value.trim() === "") {
        add(key, locale, "empty", "missing or empty");
        continue;
      }
      // next-intl's default getMessageFallback returns the key path, so a value
      // that *is* the key path renders literally on screen.
      //
      // The full dotted path, not the bare leaf. `Chat.edited` is legitimately
      // "edited" and `Chat.participants` is legitimately "participants" in both
      // English and French — the loanword is standard — so a leaf test reported
      // two correct values. Nobody writes "edited" as a bug report, and everybody
      // has pasted "Chat.edited" by accident.
      if (label && value === `${label}.${key}`) add(key, locale, "self-key", `value is "${value}"`);
    }
    for (const extra of Object.keys(row))
      if (!LOCALES.includes(extra)) add(key, extra, "unknown-locale", "not a shipped locale");
  }

  for (const [locale, script] of Object.entries(SCRIPT)) {
    for (const key of keys) {
      if (isIdentifierKey(key)) continue;
      const value = str(key, locale);
      if (!value) continue;
      if (!script.test(value)) {
        // A bare Latin term is not a sentence in the wrong script. Chinese and
        // Japanese both write `Cookie` — there is no Han character in the value
        // because the value *is* the term, and the term is not translated. The
        // rule is about prose, so it exempts a value that is nothing but
        // allowlisted terms and punctuation.
        const words = markup(value).match(/[A-Za-z][A-Za-z.'’-]*/g) ?? [];
        const onlyKnownTerms =
          words.length > 0 &&
          words.every((w) => ALLOWED_LATIN.has(core(w).toLowerCase())) &&
          !/[^\s\w.'’,;:!?&()/-]/u.test(value);
        if (onlyKnownTerms) continue;
        add(key, locale, "wrong-script", `expected ${locale} script — "${value}"`);
        continue;
      }
      const stripped = markup(value).replace(UNIT_AFTER_NUMBER, " ").replace(UNIT_ALWAYS, " ");
      for (const run of stripped.match(/[A-Za-z][A-Za-z.'’-]*/g) ?? []) {
        if (ALLOWED_LATIN.has(core(run).toLowerCase()) || LATIN_RUN_OK.test(run)) continue;
        add(key, locale, "stray-latin", `"${run}" in "${value}"`);
      }
    }
  }

  for (const locale of LOCALES) {
    for (const key of keys) {
      if (isIdentifierKey(key)) continue;
      const value = str(key, locale);
      if (!value) continue;
      if ((value.match(/[«»""„“”]/g) ?? []).length % 2 !== 0) add(key, locale, "unbalanced-quotes", value);
      // Brackets too. `,)mohon jangan gunakan` — a half-finished edit — is the
      // shape a truncated or spliced translation takes, and it is invisible to
      // every other check here because the text around it is perfectly valid
      // in the target language.
      for (const [open, close] of [
        ["(", ")"],
        ["[", "]"],
        ["«", "»"],
      ] as const) {
        const a = (value.match(new RegExp(`\\${open}`, "g")) ?? []).length;
        const b = (value.match(new RegExp(`\\${close}`, "g")) ?? []).length;
        if (a !== b) add(key, locale, "unbalanced-bracket", `${a} × "${open}" vs ${b} × "${close}" — "${value}"`);
      }
      // An unterminated rich-text tag: `t.rich` throws at render time, which is
      // a 500 on a public page rather than a missing string.
      const open = value.match(/<([a-zA-Z][\w-]*)>/g) ?? [];
      const close = value.match(/<\/([a-zA-Z][\w-]*)>/g) ?? [];
      if (open.length !== close.length)
        add(key, locale, "unbalanced-tag", `${open.length} open, ${close.length} close — "${value}"`);
    }
  }

  // The inverse of the rule above, and it exists because of a real defect:
  // `id` once carried `RELATED热penipuan` — latin, a stray CJK glyph and an
  // Indonesian word spliced into one token. The forward check cannot see it,
  // because Indonesian *is* Latin script: a Chinese character sitting in an
  // Indonesian sentence is as wrong as an English word in an Arabic one, and
  // the only way to catch it is to look for foreign scripts inside the Latin
  // locales.
  const FOREIGN =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Thai}\p{Script=Hangul}]/u;
  for (const locale of LOCALES) {
    if (SCRIPT[locale]) continue;
    for (const key of keys) {
      const value = str(key, locale);
      if (!value) continue;
      const match = value.match(FOREIGN);
      if (match) add(key, locale, "foreign-script", `"${match[0]}" in "${value}"`);
    }
  }

  // An English sentence left in another locale, verbatim.
  //
  // This is the hole the script rules cannot reach, and it is the largest one.
  // `ru`, `ja`, `th` and the rest are caught by looking at the script, but
  // German, French, Spanish, Italian, Portuguese, Dutch, Polish, Czech,
  // Swedish, Indonesian, Vietnamese and Turkish are *all* Latin script — so
  // "Every Coffee Saves a Meal" in `de.json` is a perfectly well-formed Latin
  // string, and no character-class check will ever see it.
  //
  // The signal is equality rather than vocabulary: an untranslated value is
  // almost always a byte-for-byte copy of the English one. A stopword heuristic
  // was the obvious alternative and is not worth it — "not" is English while
  // "nicht" is German, but "a" is a word in four of these languages and "in" is
  // a word in six, so any threshold short of absurdity reports correct
  // translations, and a guard that does that gets switched off.
  //
  // Two words minimum, because single-word values genuinely coincide across
  // languages: "Restaurant" is "Restaurant" in French, and a one-word rule would
  // report it forever. ICU arguments do not count towards the total —
  // `{count} items` is one Dutch word ("items" is the plural of "item"), and
  // counting the placeholder made it look like a two-word English sentence.
  for (const key of keys) {
    if (isIdentifierKey(key)) continue;
    const source = str(key, defaultLocale);
    if (!source || !HAS_LETTER.test(source)) continue;
    if (markup(source).trim().split(/\s+/).filter(Boolean).length < 2) continue;
    for (const locale of LOCALES) {
      if (locale === defaultLocale) continue;
      if (str(key, locale) === source) add(key, locale, "identical-to-english", `"${truncate(source)}"`);
    }
  }

  return findings;
}

const DIR = join(import.meta.dir, "..", "..", "messages");

/**
 * Turn a flat, dotted batch into the nested shape next-intl resolves.
 *
 * `errors.invalidCredentials` becomes `{ errors: { invalidCredentials } }`, and it
 * has to: next-intl splits a key on `.` and descends, so a catalogue holding the
 * literal string `"errors.invalidCredentials"` renders **undefined** for
 * `t("AuthFlow.errors.invalidCredentials")`. Five namespaces in the catalogue
 * already nest — `Reports.reasons`, `languageSettings.presets`,
 * `profile.avatar`, `ChallengeReveal.keyboardHints`,
 * `languageSettings.regions` — and every one of them is invisible to a
 * single-level installer.
 */
function nest(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [dotted, value] of Object.entries(flat)) {
    const segments = dotted.split(".");
    let node = out;
    for (const segment of segments.slice(0, -1)) {
      const child = node[segment];
      if (!child || typeof child !== "object") node[segment] = {};
      node = node[segment] as Record<string, unknown>;
    }
    node[segments[segments.length - 1]] = value;
  }
  return out;
}

/** Every leaf of a nested object, as dotted paths. */
export function paths(source: unknown, prefix = ""): string[] {
  if (typeof source === "string") return [prefix];
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Replace one top-level member of a catalogue, textually.
 *
 * The whole point of this module is that it does not round-trip a catalogue
 * through `JSON.parse`/`stringify`: the root carries the key `"0"`, and integer
 * -like keys are hoisted to the front, so a round trip reorders the file and the
 * diff stops being reviewable. So a member is replaced by locating its block in
 * the original text and swapping that span.
 *
 * The brace count skips string literals and their escapes, because a value may
 * legitimately contain `{` or `}` — `ChallengeReveal.keyboardHints` and the
 * radius buckets in `languageSettings` both do, and a naive count would cut the
 * namespace in half and write a file that no longer parses.
 */
function spliceMember(raw: string, name: string, value: unknown): string {
  const marker = `\n  "${name}": `;
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error(`${name}: not found at the top level of the catalogue`);

  const open = raw.indexOf("{", at + marker.length - 1);
  if (open < 0) throw new Error(`${name}: no opening brace`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  let close = -1;
  for (let i = open; i < raw.length; i++) {
    const char = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) throw new Error(`${name}: no matching closing brace`);

  // The whole member, name included, replacing the whole span from the newline
  // before the name to the namespace's own closing brace.
  //
  // Taking only the body is the obvious version and it is wrong by two
  // characters: `JSON.stringify({ AuthFlow: … })` ends with the *root's* `}`, so
  // slicing from the inner `{` to `lastIndexOf("}")` keeps a stray `}` and its
  // newline, and every one of the twenty-one files comes out unparseable.
  const block = JSON.stringify({ [name]: value }, null, 2);
  const member = block.slice(block.indexOf("\n") + 1, block.lastIndexOf("\n"));
  const next = `${raw.slice(0, at)}${member}${raw.slice(close + 1)}`;
  JSON.parse(next);
  return next;
}

/**
 * Append a namespace to every catalogue, textually.
 *
 * Not a `JSON.parse`/`stringify` round trip: the catalogues contain the key
 * `"0"`, and JS object key ordering hoists integer-like keys to the front, so
 * a round trip silently reorders the file and the diff stops being reviewable.
 *
 * Dotted keys are nested by `nest()` above, so a batch can be written flat and
 * still land in the shape `t()` resolves.
 */
export async function install(ns: Namespace, dir = DIR): Promise<void> {
  for (const locale of LOCALES) {
    const path = join(dir, `${locale}.json`);
    const raw = await Bun.file(path).text();
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const [name, body] of Object.entries(ns)) {
      const keys = Object.keys(body);
      const values = Object.fromEntries(
        keys.map((key) => {
          const value = body[key]?.[locale];
          if (typeof value !== "string") throw new Error(`${locale}/${name}.${key}: no value in the batch`);
          return [key, value];
        }),
      );

      if (name in parsed) {
        // Add or replace, creating intermediate objects on the way down.
        //
        // This used to refuse a key the namespace did not already have, on the
        // theory that a key nobody expected is a typo. But every batch that
        // *adds* keys is then impossible to install — the namespace cannot hold a
        // key before the batch that introduces it — so the check only ever fired
        // on mistakes that the caller's own key-set comparison catches properly:
        // a key in `de.json` that is in no other locale, or in none of them.
        const existing = parsed[name] as Record<string, unknown>;
        for (const key of keys) {
          const segments = key.split(".");
          let node = existing;
          for (const segment of segments.slice(0, -1)) {
            const child = node[segment];
            // A leaf where a branch is needed: `errors` is a string and the batch
            // wants `errors.rateLimited` to be one. That is a structural mistake
            // worth stopping for, and silently overwriting the string would hide
            // it until a reader saw the key path on screen.
            if (child !== undefined && (typeof child !== "object" || Array.isArray(child)))
              throw new Error(
                `${locale}/${name}.${key}: "${segments[0]}" is a ${
                  Array.isArray(child) ? "list" : typeof child
                }, so it cannot hold nested keys`,
              );
            if (child === undefined) node[segment] = {};
            node = node[segment] as Record<string, unknown>;
          }
          node[segments[segments.length - 1]] = values[key];
        }
        // And then **write it back**, which this branch did not do.
        //
        // It mutated `parsed` and fell through to `continue`, and the only
        // write in the function was on the new-namespace path. So
        // updating an existing namespace printed a success message, passed
        // `validate()`, and left all twenty-one files byte-for-byte unchanged.
        // Every batch so far had *created* a namespace, so nothing had ever
        // exercised this — the first batch to add a key to one that already
        // existed is the first one that could notice.
        await Bun.write(path, spliceMember(raw, name, existing));
        continue;
      }

      const close = raw.lastIndexOf("}");
      if (close < 0) throw new Error(`${locale}: no closing brace`);
      const block = JSON.stringify({ [name]: nest(values) }, null, 2);
      // `block` is a complete object; the catalogue already has one, so splice
      // in only the member — which `JSON.stringify` has already indented to the
      // right level for a two-space root.
      const member = block.slice(block.indexOf("\n") + 1, block.lastIndexOf("\n"));
      const next = `${raw.slice(0, close).trimEnd()},\n${member}\n}\n`;
      JSON.parse(next);
      await Bun.write(path, next);
    }
  }
}
