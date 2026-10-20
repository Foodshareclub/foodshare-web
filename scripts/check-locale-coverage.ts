#!/usr/bin/env bun
/**
 * Locale coverage: does a shipped locale actually contain a translation?
 *
 * Every other guard here asks about a *key*. This one asks about a *locale*,
 * because that is the question the per-key guards cannot answer in a form
 * anybody can act on.
 *
 * `check:catalogue` now sees all 611 of the flat root keys and reports 5,220
 * findings against them. That number is true and it is useless on its own: it
 * is the same 381 keys sitting in the same 13 catalogues, and no one is going to
 * fix "381 keys in 13 locales" — it is not a task, it is a symptom. The task is
 * that nine of the twenty-one shipped locales have never been translated:
 *
 *   ar  hi  it  ko  nl  pl  tr   467 / 469 flat keys are byte-identical English
 *   sv  th                                        513 / 515
 *
 * while the other eleven are at 1–4%. So the honest report is one line per
 * locale with a percentage, and the gate is that the percentage may only fall.
 *
 * That gate is the durable part. A catalogue is generated, merged and
 * occasionally restored from somewhere else, and the failure mode is not a
 * mistranslation — it is a whole locale quietly reverting to English while
 * `translations:check` stays green, because every key is still *present*. This
 * is the guard that catches that.
 *
 * ## What it deliberately does not own
 *
 * **Missing keys.** A locale that has *deleted* its translations is a
 * regression this guard is blind to, and it says so rather than half-covering
 * it: deleting half of a catalogue lowers the numerator and the denominator
 * together, so the ratio is unchanged. `translations:check` owns that, with a
 * per-locale missing budget and a ratchet.
 *
 * **A specific untranslated key.** `check:catalogue` owns that, per key, per
 * rule, baselined. The two guards are deliberately disjoint: one says "this
 * locale is not translated", the other says "this string is not translated".
 *
 * ## What it covers that the other guard structurally cannot
 *
 * `check:catalogue`'s `identical-to-english` rule needs two words in the English
 * source, because single words coincide legitimately across languages —
 * "Restaurant" is "Restaurant" in French, "Status" is "Status" in German. So
 * `de` holding `password: "Password"` is invisible there, and that is the single
 * most likely key in the app to be reverted.
 *
 * It is visible here: a revert raises the locale's share by one key, and this
 * gate fires on **any** rise. Checked by reverting `de.password` in a copy of
 * `messages/` and running both guards — this one failed, the other passed. The
 * pairing is the coverage; neither guard has the hole on its own.
 *
 * ## The threshold
 *
 * A majority. A locale where more than half the values it does carry are
 * byte-identical to English is not a partially-translated locale; it is an
 * English locale with a different file name, and reporting its 4,000 keys as
 * individual defects would describe the file rather than the problem.
 *
 * Usage:
 *   bun run check:locale-coverage                  # the gate
 *   bun run check:locale-coverage -- --report      # the table
 *   bun run check:locale-coverage -- --write-baseline
 */

import { join } from "bun:path";

import { LOCALES, defaultLocale } from "./lib/catalogue-batch";

/**
 * `--messages <dir>` and `--baseline <file>`, matching `check-catalogue`, so
 * both guards can be pointed at a worktree or a fixture instead of only at the
 * shipped tree.
 */
const flag = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const MESSAGES = flag("messages", join(import.meta.dir, "..", "messages"));
const BASELINE = flag("baseline", join(import.meta.dir, "check-locale-coverage-baseline.json"));

// Colour, unless the environment says not to. `NO_COLOR` is the convention
// (no-color.org) and a CI log is a machine-read place, not a terminal — which
// is also what lets the tests assert on the output as plain text.
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

/** More than this share of byte-identical values and the locale is English. */
const UNTRANSLATED_SHARE = 0.5;

/**
 * Every catalogue, read once.
 *
 * `load()` used to re-read and re-parse the same JSON file on every call.
 * Reading them all up front with `Bun.file().json()` makes every lookup a map
 * hit and the file reads happen once.
 */
const CATALOGUES = new Map<string, Record<string, unknown>>(
  await Promise.all(
    LOCALES.map(
      async (locale) =>
        [locale, (await Bun.file(join(MESSAGES, `${locale}.json`)).json()) as Record<string, unknown>] as const,
    ),
  ),
);

const load = (locale: string): Record<string, unknown> => CATALOGUES.get(locale) ?? {};

/**
 * A catalogue is `string` leaves, nested or flat, and every leaf is compared to
 * the English one at the same path.
 *
 * Flat and nested are counted separately and deliberately, because the split is
 * the whole story: a locale can be 100% translated in the namespaces written
 * after `next-intl` was adopted and 0% in the flat keys the legacy UI reads,
 * and a single average hides exactly the part that is broken.
 */
export interface Coverage {
  flatPresent: number;
  flatIdentical: number;
  nestedPresent: number;
  nestedIdentical: number;
}

/**
 * One string leaf: `[container, pathWithinIt]`.
 *
 * `pathWithinIt` is `null` for a flat root key and a dotted path otherwise —
 * `upload` for `AuthFlow.upload`, `avatar.upload` for `profile.avatar.upload`,
 * `presets.10.label` for the radius buckets in `languageSettings`.
 *
 * Two slots rather than three, because the earlier three-slot shape lost the
 * container: it stored the *first* path segment where the namespace belonged, so
 * `profile.avatar.upload` was looked up as a top-level key named `avatar` and
 * every nested leaf counted as absent. The type is the guard against that.
 */
export type Leaf = [string, string | null];

/**
 * Read a dotted path out of a catalogue, one segment at a time.
 *
 * Walked rather than indexed, because five namespaces nest a sub-object
 * (`profile.avatar`, `Reports.reasons`, `ChallengeReveal.keyboardHints`,
 * `languageSettings.presets`, `languageSettings.regions`) and a two-level read
 * silently reported those sub-trees as absent — the same blindness the flat keys
 * had, one level down.
 */
const readPath = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[segment];
  }, source);

/**
 * Every string leaf in a reference catalogue, as
 * `[container, namespace, dottedPathWithinIt]` — `namespace` is `null` for the
 * flat root keys, and the path is relative to it.
 *
 * Recursive to the bottom. The leaf *key* is carried rather than its value, which
 * is not a simplification but the bug it prevents: an earlier version put the
 * English value in this slot, every nested lookup missed, and the namespaced half
 * of the catalogue reported as 0 present in all twenty locales — a clean,
 * plausible table, wrong in the one direction a reviewer cannot check by eye.
 */
export function leavesOf(reference: Record<string, unknown>): Leaf[] {
  const leaves: Leaf[] = [];
  const walk = (value: unknown, path: string, container: string): void => {
    if (typeof value === "string") {
      if (path) leaves.push([container, path]);
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>))
      walk(child, path ? `${path}.${key}` : key, container);
  };
  for (const [container, value] of Object.entries(reference)) {
    if (typeof value === "string") {
      leaves.push([container, null]);
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    walk(value, "", container);
  }
  return leaves;
}

export function measure(
  catalog: Record<string, unknown>,
  reference: Record<string, unknown>,
  leaves: Leaf[],
): Coverage {
  const coverage: Coverage = {
    flatPresent: 0,
    flatIdentical: 0,
    nestedPresent: 0,
    nestedIdentical: 0,
  };
  for (const [container, within] of leaves) {
    const branch = catalog[container];
    if (branch === undefined) continue;
    // A flat root key is its own value, not a path — walking it would index a
    // string, and `readPath` returns undefined for that, which is how the flat
    // half silently became 0 present while the nested half looked fine.
    const expected = within === null ? reference[container] : readPath(reference[container], within);
    const value = within === null ? branch : readPath(branch, within);
    if (typeof value !== "string" || typeof expected !== "string") continue;
    if (within === null) {
      coverage.flatPresent++;
      if (value === expected) coverage.flatIdentical++;
    } else {
      coverage.nestedPresent++;
      if (value === expected) coverage.nestedIdentical++;
    }
  }
  return coverage;
}

export const share = (c: Coverage): number => {
  const present = c.flatPresent + c.nestedPresent;
  return present === 0 ? 0 : (c.flatIdentical + c.nestedIdentical) / present;
};

/**
 * Every way `actual` can be worse than `baseline`, as a line a human can act on.
 *
 * Two failure modes, and the second one is not obvious enough to leave out:
 *
 *  - **The share rose.** A catalogue was reverted, a merge overwrote it, or a
 *    locale was added untranslated.
 *  - **The share fell without the catalogue improving.** The baseline is now
 *    over-stating the problem, which is a silent hole in every future gate —
 *    a later regression to exactly the recorded value would pass. So it is
 *    reported rather than absorbed, with the instruction to re-baseline.
 *
 * A locale missing from the baseline is new to the guard and is judged on its
 * own merits, since there is nothing to regress from.
 */
export function findRegressions(
  baseline: Record<string, Coverage>,
  actual: Record<string, Coverage>,
  threshold = UNTRANSLATED_SHARE,
): string[] {
  const out: string[] = [];
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

  for (const [locale, now] of Object.entries(actual)) {
    const was = baseline[locale];
    if (!was) {
      if (share(now) >= threshold)
        out.push(`${locale} is new to this guard and ${percent(share(now))} of it is byte-identical English`);
      continue;
    }
    const wasShare = share(was);
    const nowShare = share(now);
    if (nowShare > wasShare + 1e-9) {
      out.push(
        `${locale}: ${percent(nowShare)} byte-identical to English, was ${percent(wasShare)}\n` +
          `      flat ${was.flatIdentical}/${was.flatPresent} → ${now.flatIdentical}/${now.flatPresent}, ` +
          `nested ${was.nestedIdentical}/${was.nestedPresent} → ${now.nestedIdentical}/${now.nestedPresent}`,
      );
    } else if (nowShare < wasShare - 1e-9) {
      out.push(
        `${locale}: the baseline says ${percent(wasShare)}, the catalogue says ${percent(nowShare)} — translate more strings and re-run --write-baseline, because a baseline that over-states the problem hides the next regression`,
      );
    }
  }
  return out;
}

/**
 * The CLI. Split out of the module so the logic above can be tested
 * directly, which is the only way to prove the gate fails — the same
 * arrangement `check-build-network.ts` uses for its `diagnose()`.
 */
async function main(): Promise<void> {
  const reference = load(defaultLocale);
  const leaves = leavesOf(reference);
  const others = LOCALES.filter((locale) => locale !== defaultLocale);
  const actual: Record<string, Coverage> = Object.fromEntries(
    others.map((l) => [l, measure(load(l), reference, leaves)]),
  );

  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const untranslated = others.filter((locale) => share(actual[locale]) >= UNTRANSLATED_SHARE);

  if (process.argv.includes("--write-baseline")) {
    await Bun.write(BASELINE, `${JSON.stringify(actual, null, 2)}\n`);
    console.log(`\n${GREEN}✓${RESET} Baseline written for ${others.length} locale(s).`);
    console.log(
      `  ${untranslated.length} untranslated at the ${percent(UNTRANSLATED_SHARE)} threshold: ` +
        `${untranslated.join(" ")}\n`,
    );
    process.exit(0);
  }

  console.log(`\n${BOLD}Locale coverage${RESET}`);
  console.log(
    `  ${DIM}${leaves.length} string(s) in ${defaultLocale}.json — flat and nested counted separately${RESET}\n`,
  );

  if (process.argv.includes("--report")) {
    console.log(
      `  ${"locale".padEnd(7)}${"flat identical".padStart(16)}${"nested identical".padStart(18)}  ${"total".padStart(7)}`,
    );
    for (const locale of others) {
      const c = actual[locale];
      const bad = share(c) >= UNTRANSLATED_SHARE;
      console.log(
        `  ${locale.padEnd(7)}${`${c.flatIdentical}/${c.flatPresent}`.padStart(16)}` +
          `${`${c.nestedIdentical}/${c.nestedPresent}`.padStart(18)}  ` +
          `${(bad ? RED : GREEN) + percent(share(c)) + RESET}`,
      );
    }
    const listed = untranslated.length ? `${RED}${untranslated.join(" ")}${RESET}` : `${GREEN}none${RESET}`;
    console.log(`\n  ${untranslated.length} locale(s) at or above ${percent(UNTRANSLATED_SHARE)}: ${listed}\n`);
    process.exit(0);
  }

  const baseline = await (async () => {
    if (!(await Bun.file(BASELINE).exists())) {
      console.error(
        `  ${RED}No baseline. Create it with:${RESET}\n      bun run check:locale-coverage -- --write-baseline\n`,
      );
      process.exit(1);
    }
    return (await Bun.file(BASELINE).json()) as Record<string, Coverage>;
  })();

  const regressions = findRegressions(baseline, actual);

  if (regressions.length > 0) {
    console.error(`\n${RED}${BOLD}Locale coverage regressed${RESET}\n`);
    for (const line of regressions) console.error(`  ${line}`);
    console.error(
      [
        "",
        "  A locale is a translation or it is not. When the share of values that",
        "  are byte-identical to English rises, a catalogue has been reverted, a",
        "  merge has overwritten it, or a locale has been added without being",
        "  translated — and `translations:check` stays green through all three,",
        "  because every key is still present. Only the value is wrong.",
        "",
        `  Current, from ${untranslated.length} untranslated of ${others.length}:`,
        ...untranslated.map(
          (locale) =>
            `    ${locale.padEnd(4)} ${percent(share(actual[locale])).padStart(6)}  ${DIM}not translated${RESET}`,
        ),
        ...(untranslated.length === 0 ? [`    ${GREEN}every shipped locale is translated${RESET}`] : []),
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  const flat = untranslated.length === 0;
  console.log(
    `  ${flat ? GREEN : YELLOW}✓${RESET} No locale regressed ` +
      `(${untranslated.length} of ${others.length} still untranslated at the ` +
      `${percent(UNTRANSLATED_SHARE)} threshold: ${untranslated.join(" ") || "none"}).`,
  );
  console.log(`  ${DIM}· Run 'bun run check:locale-coverage -- --report' for the table.\n`);
}

if (import.meta.main) await main();
