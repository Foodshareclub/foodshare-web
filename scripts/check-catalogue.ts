#!/usr/bin/env bun
/**
 * Catalogue integrity: script boundaries, identifiers, and malformed messages.
 *
 * Every other guard in this repo checks a property of *code*. This one checks a
 * property of *output* — of the 947 strings a reader actually sees — and the
 * reason it exists is that the two defects it was written for were both found
 * by a person reading the catalogue by hand, not by anything:
 *
 *   - an English *thereby* had landed inside an Arabic sentence
 *   - `id` had picked up `RELATED热penipuan` — latin, a stray CJK glyph and an
 *     Indonesian word spliced into one token
 *
 * A translation error is invisible to a build, to `tsc`, to the budget and to
 * the test suite: a machine translation and a human one are both "a non-empty
 * string" to everything the repo can check. `translations:check` is no help
 * either, because it asks "does the key exist in every locale" and the answer
 * is yes.
 *
 * The rules are deliberately few, and each was added or narrowed because it
 * reported a string that was already correct. A guard that reports correct code
 * is a guard that gets switched off.
 *
 * 1. `wrong-script`   prose in a locale whose script it is not written in.
 * 2. `stray-latin`    a Latin word inside non-Latin prose.
 * 3. `foreign-script` the inverse: a non-Latin character inside a Latin-script
 *                     locale, which is how the `id` defect hid from rule 2.
 * 4. `self-key`       a value equal to its own key path — next-intl renders
 *                     that literally on screen.
 * 5. `unbalanced-*`   quotes, brackets or rich-text tags. Half of these are
 *                     invisible translations spliced together; the tag case
 *                     makes `t.rich` throw at render time, a 500 rather than a
 *                     missing string.
 *
 * Rules 2 and 3 are what a `--write-baseline` mode is for: the legacy
 * catalogue has never been audited for this, and failing 900 pre-existing
 * strings on the day the guard lands would mean switching it off within a week.
 * So it is a ratchet, per file and per rule — the same shape as
 * `check-i18n-text`, and for the same reason.
 *
 * ## The guard was blind to the 611 strings readers see most
 *
 * This file originally iterated `Object.keys(reference)` and kept the entries
 * whose value is an object. Every namespace qualified; **the 611 flat keys at
 * the root of `messages/en.json` did not**, because their value is a string —
 * so a `typeof` test skipped them while they were the strings the entire
 * pre-namespace UI draws from: `password`, `email_address`, `first_name`,
 * `hide_password`, `forgot_password`, `logging_in`, `cancel`, `loading`. The
 * docstring claimed to check "the 947 strings a reader actually sees" and
 * checked 336 of them.
 *
 * So the root is loaded as a synthetic namespace, `(root)`, and checked by the
 * same rules. That adds 5,220 findings over four rules, baselined per rule as
 * always — the difference between a translation defect being *invisible* and
 * being *known and shrinking*.
 *
 * Which locales they are is not a per-key question at all, so it is not asked
 * here: that is `scripts/check-locale-coverage.ts`, which reports a locale that
 * has not been translated as one line instead of as four thousand findings.
 *
 * ## It also read one level deep, and the catalogue is two
 *
 * Five namespaces carry a nested object: `profile.avatar`, `Reports.reasons`,
 * `ChallengeReveal.keyboardHints`, `languageSettings.presets`,
 * `languageSettings.regions`. The reshape below read `Object.keys(namespace)` and
 * took string values only, so every one of those sub-trees was invisible for the
 * same reason the root was — a `typeof` test quietly deciding what a reader
 * sees. They are flattened as `reasons.report` rather than skipped, which also
 * means `self-key` compares against the path that would actually be rendered.
 *
 * ## The one-word limit, and which guard covers it
 *
 * `identical-to-english` needs two words in the English source, because single
 * words coincide legitimately across languages — "Restaurant" is "Restaurant" in
 * French and "Status" is "Status" in German, so a one-word rule would report
 * both forever. **`de` holding `password: "Password"` is therefore invisible
 * here.** Verified rather than assumed: reverting one flat key in one locale
 * leaves this guard green.
 *
 * It is caught anyway, by `check:locale-coverage`, because a revert raises that
 * locale's share of byte-identical values by one key and its gate fires on any
 * rise at all. That pairing is load-bearing — its docstring says the same thing
 * from the other side. A stopword threshold is the obvious way to close the gap
 * from here and is not worth it: "a" is a word in four of the Latin-script
 * locales and "in" in six, so any threshold short of absurdity reports correct
 * translations, and a guard that does that is a guard that gets switched off.
 *
 * Usage:
 *   bun run check:catalogue                 # the gate
 *   bun run check:catalogue -- --report     # grouped findings, `--ns=<name>` to narrow
 *   bun run check:catalogue -- --write-baseline
 *   bun run check:catalogue -- --messages <dir> --baseline <file>
 */

import { join } from "bun:path";

import { defaultLocale } from "../src/i18n/config";
import { ALLOWED_LATIN, IDENTIFIER_KEYS, LOCALES, validate } from "./lib/catalogue-batch";

/**
 * `--messages <dir>` and `--baseline <file>` exist so the guard can be pointed at
 * a catalogue that is not the shipped one — a worktree, a branch, or the fixture
 * a test builds. A guard that only runs against the real tree is a guard whose
 * failure modes can only be checked by breaking the real tree, and the
 * alternative here is editing `messages/*.json` in place during a test run, which
 * is the mistake Phase 23 of the plan is about.
 */
const flag = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const MESSAGES = flag("messages", join(import.meta.dir, "..", "messages"));
const BASELINE = flag("baseline", join(import.meta.dir, "check-catalogue-baseline.json"));

// Colour, unless the environment says not to. `NO_COLOR` is the convention
// (no-color.org) and a CI log is a machine-read place, not a terminal — which is
// also what lets the tests assert on this output as plain text.
//
// Each sequence is dropped whole. Emitting `[31m` without the escape is not
// "no colour", it is mojibake in every log that does not strip it.
const paint = (code: string) => (process.env.NO_COLOR ? "" : `\x1b[${code}m`);
const RED = paint(31);
const GREEN = paint(32);
const YELLOW = paint(33);
const BOLD = paint(1);
const DIM = paint(2);
const RESET = paint(0);

type Catalog = Record<string, unknown>;
type Row = Record<string, string>;
type Namespace = Record<string, Row>;

/**
 * Every catalogue, read once.
 *
 * `load()` used to re-read and re-parse the same JSON file on every call, and
 * it is called once per key per locale — the guard was doing the same I/O
 * hundreds of times over a full run. Reading them all up front with
 * `Bun.file().json()` makes every lookup a map hit and the file reads happen
 * once.
 */
const CATALOGUES = new Map<string, Catalog>(
  await Promise.all(
    [...new Set([...LOCALES, defaultLocale])].map(
      async (locale) => [locale, (await Bun.file(join(MESSAGES, `${locale}.json`)).json()) as Catalog] as const,
    ),
  ),
);

const load = (locale: string): Catalog => CATALOGUES.get(locale) ?? {};

/** Read a dotted path out of a catalogue, one segment at a time. */
const readPath = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[segment];
  }, source);

/**
 * Whether a dotted path resolves to a string in a catalogue.
 *
 * Needed because the namespace filter below asks "does this locale have every
 * one of this namespace's keys?", and after `flatten` the keys are dotted paths.
 * `key in namespace` answers that wrongly for every nested key — `"reasons.spam"
 * in Reports` is false while `Reports.reasons.spam` exists — which silently
 * dropped the three namespaces that nest something out of the guard's scope. A
 * namespace vanishing from a baseline is invisible: there is nothing left to
 * fail.
 */
const hasPath = (source: unknown, path: string): boolean => {
  const value = readPath(source, path);
  return typeof value === "string";
};

const reference = load(defaultLocale) as Catalog;

/**
 * The flat keys at the root of the catalogue, as a namespace the rules can see.
 *
 * `label` is `""`, which disables the `self-key` rule for these keys: that rule
 * matches a value against `"<namespace>.<key>"`, and a flat key's path is the
 * bare key, so there is no path to match. The other four rules are unaffected —
 * and the limit is pinned by a test rather than left implicit.
 */
const ROOT_NAMESPACE = "(root)";

/**
 * Every string leaf under `source`, as `dottedPath -> Row`.
 *
 * Recursive on purpose: a nested object in a namespace is as invisible to
 * `Object.keys` as a flat key is to a `typeof` test, and five namespaces have
 * one. One level of nesting exists today; the depth is not the point, walking
 * to the bottom is.
 */
const flatten = (source: Namespace, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object" && !Array.isArray(value)) Object.assign(out, flatten(value, path));
  }
  return out;
};

const rootBatch: Namespace = {};
for (const [key, value] of Object.entries(reference)) {
  if (typeof value !== "string") continue;
  const row: Row = { [defaultLocale]: value };
  for (const locale of LOCALES) {
    if (locale === defaultLocale) continue;
    const translated = (load(locale) as Catalog)[key];
    if (typeof translated === "string") row[locale] = translated;
  }
  rootBatch[key] = row;
}

/**
 * Only the namespaces that are *fully translated* get checked, and a namespace
 * qualifies when the default locale has it and at least one other locale has
 * every one of its keys. The rest are the legacy debt this guard is a ratchet
 * over; reporting them as new would be reporting the state of the repository
 * rather than a change in it.
 *
 * `(root)` is exempt from that filter and added unconditionally, because the
 * filter's premise — "some locale has every key, so this namespace is in use" —
 * is about whether a namespace is being worked on. The root is not a unit of
 * work; it is the whole legacy catalogue, and it is the same whether or not any
 * single locale has translated it. Its missing keys are `empty` findings, which
 * the gate filters out below because `translations:check` owns them.
 */
const namespaces = [
  ROOT_NAMESPACE,
  ...Object.keys(reference).filter((name) => {
    const source = reference[name];
    if (!source || typeof source !== "object" || Array.isArray(source)) return false;
    const keys = Object.keys(flatten(source as Namespace));
    return LOCALES.some(
      (locale) =>
        locale !== defaultLocale &&
        (load(locale) as Catalog)[name] !== undefined &&
        keys.every((key) => hasPath((load(locale) as Catalog)[name], key)),
    );
  }),
];

/**
 * `empty` is filtered out here on purpose. It is real, and `validate` reports
 * it, but `translations:check` already owns it — with a per-locale budget, a
 * ratchet, and a stated reason for every number in it. Re-reporting 1,471
 * missing translations from a second guard would add noise, not coverage, and a
 * guard that reports 95% known debt is a guard nobody reads.
 *
 * What is left is the set `translations:check` structurally cannot see: it
 * asks whether a key exists in every locale, and every one of the following is
 * a key that exists, in every locale, with the wrong *value*.
 */
const findings: Array<{ file: string; key: string; locale: string; rule: string; detail: string }> = [];

for (const name of namespaces) {
  // `rootBatch` is already key -> locale -> value, so it is not reshaped; a
  // namespace has to be read out of the catalogue first.
  const batch: Namespace =
    name === ROOT_NAMESPACE
      ? rootBatch
      : Object.fromEntries(
          Object.entries(flatten(reference[name] as Namespace)).map(([key, source]) => {
            const row: Row = { en: source };
            for (const locale of LOCALES) {
              if (locale === defaultLocale) continue;
              const translated = readPath((load(locale) as Catalog)[name], key);
              if (typeof translated === "string") row[locale] = translated;
            }
            return [key, row];
          }),
        );
  for (const finding of validate(batch, name === ROOT_NAMESPACE ? "" : name)) {
    if (finding.rule === "empty") continue;
    findings.push({ file: name, ...finding });
  }
}

findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.key.localeCompare(b.key));

const total = findings.length;

if (process.argv.includes("--write-baseline")) {
  // Counts *keys* per (namespace, rule), not findings: twenty locales all
  // holding the same untranslated English is one problem, not twenty, and a
  // baseline that grows by twenty when one string is reverted is a baseline
  // nobody trusts.
  const counts: Record<string, Record<string, number>> = {};
  const seen = new Set<string>();
  for (const finding of findings) {
    const id = `${finding.file}|${finding.rule}|${finding.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    counts[finding.file] ??= {};
    const file = counts[finding.file];
    file[finding.rule] = (file[finding.rule] ?? 0) + 1;
  }
  await Bun.write(BASELINE, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`\n${GREEN}✓${RESET} Baseline written: ${total} finding(s) across ${namespaces.length} namespace(s).\n`);
  process.exit(0);
}

console.log(`\n${BOLD}Catalogue integrity check${RESET}`);
console.log(`  ${DIM}${namespaces.length} fully-translated namespace(s), ${LOCALES.length} locales${RESET}\n`);

if (process.argv.includes("--report")) {
  // Grouped, not one line per finding. A line per finding is the right shape for
  // 108 findings and an unusable one for 5,328, which is what the root namespace
  // turned the report into — 381 keys held in English across 13 locales is 3,197
  // lines saying the same thing thirteen times.
  //
  // So: a header per (namespace, rule) carrying the count and the locales, then
  // the offending keys capped at twelve. `--ns=<name>` narrows it further,
  // because "what is still English in `sv`?" is a per-locale question and
  // `(root)` is where it is answered.
  const wanted = process.argv.find((arg) => arg.startsWith("--ns="))?.slice(5);
  const groups = new Map<string, typeof findings>();
  for (const finding of findings) {
    if (wanted && finding.file !== wanted) continue;
    const id = `${finding.file} ${finding.rule}`;
    const group = groups.get(id);
    if (group) group.push(finding);
    else groups.set(id, [finding]);
  }

  for (const [id, group] of groups) {
    const [file, rule] = id.split(" ");
    const keys = [...new Set(group.map((f) => f.key))];
    const locales = [...new Set(group.map((f) => f.locale))];
    console.log(
      `  ${BOLD}${file}${RESET} · ${YELLOW}${rule}${RESET}  ${DIM}${keys.length} key(s) · ` +
        `${group.length} finding(s) · ${locales.length} locale(s): ${locales.join(" ")}${RESET}`,
    );
    for (const key of keys.slice(0, 12)) {
      const example = group.find((f) => f.key === key);
      console.log(`      ${key.padEnd(52)} ${DIM}${example?.detail ?? ""}${RESET}`);
    }
    if (keys.length > 12) console.log(`      ${DIM}… +${keys.length - 12} more${RESET}`);
    console.log();
  }
  console.log(`  ${total} finding(s).\n`);
  process.exit(0);
}

const baseline: Record<string, Record<string, number>> = (await Bun.file(BASELINE).exists())
  ? ((await Bun.file(BASELINE).json()) as Record<string, Record<string, number>>)
  : null;

if (baseline === null) {
  console.error(`  ${RED}No baseline. Create it with:${RESET}\n      bun run check:catalogue -- --write-baseline\n`);
  process.exit(1);
}

/**
 * One line per (namespace, rule), with the offending keys named.
 *
 * Reporting a line per finding is how a guard that found 40 real problems
 * becomes a guard nobody scrolls past: the `th` catalogue is entirely English,
 * and 13 lines saying "a new rule fired — Reports.cancel/th" is less use than
 * one line naming all 13.
 */
const regressions: string[] = [];
const known = new Set(Object.entries(baseline).flatMap(([f, rules]) => Object.keys(rules).map((r) => `${f}|${r}`)));

for (const [file, rules] of Object.entries(baseline)) {
  for (const [rule, allowed] of Object.entries(rules)) {
    const hit = findings.filter((f) => f.file === file && f.rule === rule);
    const keys = new Set(hit.map((f) => f.key));
    if (keys.size <= allowed) continue;
    const locales = new Set(hit.map((f) => f.locale));
    regressions.push(
      `${file} · ${rule}: ${keys.size} key(s) now, ${allowed} allowed (+${keys.size - allowed})` +
        `\n      ${[...keys].slice(0, 8).join(", ")}${keys.size > 8 ? `, … +${keys.size - 8}` : ""}` +
        `\n      ${locales.size} locale(s): ${[...locales].slice(0, 8).join(" ")}`,
    );
  }
}

// A rule that fires for a (namespace, rule) pair the baseline never mentions is
// not a regression in a count — it is a new kind of problem, and it gets its
// own line so it cannot hide inside a count that happens to be under its cap.
for (const finding of findings) {
  if (known.has(`${finding.file}|${finding.rule}`)) continue;
  const prefix = `${finding.file} · ${finding.rule}: `;
  if (regressions.some((line) => line.startsWith(prefix))) continue;
  const hit = findings.filter((f) => f.file === finding.file && f.rule === finding.rule);
  const keys = [...new Set(hit.map((f) => f.key))];
  const locales = [...new Set(hit.map((f) => f.locale))];
  regressions.push(
    `${finding.file} · ${finding.rule}: a rule the baseline has never seen here` +
      `\n      ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? `, … +${keys.length - 8}` : ""}` +
      `\n      ${locales.length} locale(s): ${locales.slice(0, 8).join(" ")}` +
      `\n      ${DIM}${hit[0].detail}${RESET}`,
  );
}

if (regressions.length > 0) {
  console.error(`\n${RED}${BOLD}Catalogue integrity check failed${RESET}\n`);
  for (const line of regressions) console.error(`  ${line}`);
  console.error(
    [
      "",
      "  These are the properties of the rendered string that no compiler, test",
      "  or type can see. `translations:check` asks whether a key exists in every",
      "  locale; it cannot see that the value in one of them is in the wrong script.",
      "",
      "  Latin runs permitted inside non-Latin prose:",
      `    ${[...ALLOWED_LATIN].join(", ")}`,
      `  Keys held identical in every locale: ${[...IDENTIFIER_KEYS].join(", ")}`,
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`  ${GREEN}✓${RESET} No namespace exceeded its baseline (${total} finding(s) within it).`);
console.log(`  ${YELLOW}·${RESET} Run 'bun run check:catalogue -- --report' to see them.\n`);
