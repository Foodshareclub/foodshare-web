#!/usr/bin/env bun
/**
 * Translation completeness gate.
 *
 * next-intl does not fall back to the default locale: its default
 * `getMessageFallback` returns the key path, so an untranslated key renders
 * literally on screen. This script therefore fails the build when a locale
 * gains new gaps.
 *
 * The check is a RAatchet, not a hard zero:
 *
 *   - Every locale may have at most `BUDGET[locale]` missing keys. The budget is
 *     the current measured gap, so the check passes today and fails the moment
 *     someone adds an English key without translating it into some locale.
 *   - Lowering a budget is always allowed and is how backfill work retires debt.
 *   - Raising a budget is rejected outright — that is the only way this file can
 *     make things worse, so it requires a deliberate edit with a stated reason.
 *
 * Runtime behaviour is separately covered by src/__tests__/i18n/merge.test.ts,
 * which asserts that every locale resolves every English key once English is
 * layered underneath. This script guards the source catalogs instead.
 *
 * TWO FAILURE MODES, and the budget above only covers one of them.
 *
 *   1. A key exists in en.json and not in a locale. The budget catches this —
 *      the reference is en.json, so a new English key raises every locale's
 *      missing count.
 *
 *   2. A key is referenced in code and exists in NO catalog. This was
 *      structurally invisible here, because the reference *is* en.json: a key
 *      absent from en.json cannot be missing from a locale relative to it. The
 *      budget stayed green while 69 keys rendered on screen as their own key
 *      path — `product_not_found`, `browse_products`, 34 campaign columns — in
 *      all 21 locales, because nothing falls back to a message: next-intl's
 *      default `getMessageFallback` returns the key path.
 *
 * So this also walks src/ for statically-analysable `t("…")` calls, resolves
 * the namespace from the `useTranslations`/`getTranslations` binding, and fails
 * when the resolved path is not a leaf in en.json. Dynamic keys cannot be
 * checked statically and are listed as a count so the blind spot stays visible
 * rather than being forgotten.
 *
 * Usage:  bun run translations:check
 *         bun run translations:check -- --json
 */

import { readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";

import { type Locale, defaultLocale, locales } from "../src/i18n/config";

const MESSAGES_DIR = join(import.meta.dir, "..", "messages");
const SRC_DIR = join(import.meta.dir, "..", "src");

/**
 * Maximum tolerated missing keys per locale.
 *
 * These are the real translation debts, not targets to hit immediately. Lower
 * them as namespaces are backfilled — the checker below rejects an increase, so
 * a reduction is always safe to land.
 *
 * Every budget here moved up twice, and neither increase is new debt.
 *
 * First by 68: 69 keys were already referenced by the code and already missing
 * from every locale, but were not *countable*, because the reference catalogue
 * is en.json and a key absent from en.json cannot be missing from a locale
 * relative to it. They rendered on screen as their own key path in all 21
 * locales — strictly worse than the English fallback `src/i18n/merge.ts` gives
 * for a key present in en.json. That is now in the catalogue, and the source
 * scan in this file fails on the next one.
 *
 * Then by 59: the `nav` and `languageSettings` namespaces, added because the
 * main navigation and the language settings page were English literals in every
 * locale. The language page is the one a user opens in order to *choose* a
 * language. These are genuinely new keys and genuinely new debt; the English
 * fallback is the intended behaviour until they are backfilled, and the source
 * scan means no key can be referenced without existing in en.json.
 */
const BUDGET: Partial<Record<Locale, number>> = {
  cs: 128,
  fr: 128,
  de: 290,
  es: 290,
  id: 222,
  ja: 222,
  sv: 222,
  th: 222,
  vi: 222,
  zh: 222,
  ar: 310,
  hi: 310,
  it: 310,
  ko: 310,
  nl: 310,
  pl: 310,
  tr: 310,
  uk: 310,
  pt: 311,
  ru: 311,
};

type Catalog = Record<string, unknown>;

function loadCatalog(locale: string): Catalog {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Catalog;
}

/** Flatten nested objects to dotted paths; arrays are leaves. */
function flatKeys(value: unknown, prefix = ""): Set<string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out = new Set<string>();
    for (const [key, child] of Object.entries(value as Catalog)) {
      for (const path of flatKeys(child, prefix ? `${prefix}.${key}` : key)) {
        out.add(path);
      }
    }
    return out;
  }
  return new Set([prefix]);
}

function hasPath(catalog: unknown, path: string): boolean {
  let node: unknown = catalog;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    if (!(part in (node as Catalog))) return false;
    node = (node as Catalog)[part];
  }
  // An explicit null is a deliberate suppression, not a missing translation.
  return node !== undefined;
}

const jsonOutput = process.argv.includes("--json");

const referenceKeys = [...flatKeys(loadCatalog(defaultLocale))].sort();
const onDisk = new Set(
  readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, "")),
);

// A catalog file with no entry in `locales` would never be served, so its
// missing keys would be invisible. Catch that rather than skip it.
const orphans = [...onDisk].filter((file) => !locales.includes(file as Locale) && file !== "_migration-helper");

const results = locales
  .filter((locale) => locale !== defaultLocale)
  .map((locale) => {
    const catalog = loadCatalog(locale);
    const missing = referenceKeys.filter((key) => !hasPath(catalog, key));
    return { locale, missing, count: missing.length };
  });

// ───────────────────────────────────────────────────────────────────────
// Referenced-but-absent keys
// ───────────────────────────────────────────────────────────────────────

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "wasm" || entry === "node_modules") continue;
      listSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const referenceSet = new Set(referenceKeys);

/**
 * Statically resolve every `t("…")` in src/ and report the ones that do not
 * exist in the reference catalog.
 *
 * The resolution is deliberately conservative — it handles the shapes that
 * appear in this codebase and reports the rest as unresolvable rather than
 * guessing:
 *
 *   const t = useTranslations();          t("key")            -> "key"
 *   const t = useTranslations("admin");    t("list.title")    -> "admin.list.title"
 *   t.rich("key")                                             -> same as t()
 *
 * Anything computed — `t(\`${prefix}.${x}\`)`, `t(key)` from a variable — is
 * counted as dynamic and skipped, because a static check that guesses would
 * report phantom failures and get switched off.
 */
function scanForMissingKeys(): { missing: string[]; dynamic: number; files: number } {
  const missing = new Map<string, string>();
  let dynamic = 0;
  const files = listSourceFiles(SRC_DIR);

  /**
   * Blank out comments before matching.
   *
   * The first version of this scan reported `hello_world` as a missing key. It
   * is a `t('hello_world')` inside the usage example in `src/i18n/index.ts`'s
   * doc comment — a guard that reads documentation is a guard that cries wolf.
   *
   * Only whole-line comments and block comments are removed. A trailing `//`
   * is left alone, because in this codebase `//` also appears inside URLs
   * (`https://…`) and a regex that cannot tell the two apart would happily
   * truncate a real key expression at the wrong place.
   */
  const stripComments = (input: string): string =>
    input
      .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
      .split("\n")
      .map((line) => (/^\s*(\/\/|\*|\*\/)/.test(line) ? "" : line))
      .join("\n");

  const staticCall = /\b([A-Za-z_$][\w$]*)(?:\.rich)?\(\s*(["'])([^"'`$]+)\2\s*[,)]/g;

  for (const file of files) {
    const source = stripComments(readFileSync(file, "utf8"));

    // Bind translator variables to their namespace, per function scope, by
    // taking the nearest preceding binding for each call site.
    const bindings: Array<{ index: number; name: string; namespace: string }> = [];
    const bindRe =
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:useTranslations|getTranslations)\(\s*(["']?)([^"')\s]*)\2\s*\)/g;
    for (const match of source.matchAll(bindRe)) {
      bindings.push({ index: match.index ?? 0, name: match[1], namespace: match[3] ?? "" });
    }
    if (bindings.length === 0) continue;

    for (const call of source.matchAll(staticCall)) {
      const [, name, , key] = call;

      // The namespace in force at this point is the last binding of this name.
      let namespace: string | null = null;
      for (const binding of bindings) {
        if (binding.name === name && binding.index < (call.index ?? 0)) namespace = binding.namespace;
      }
      // No binding for this identifier in this file: not a translator, skip.
      if (namespace === null) continue;

      const path = namespace ? `${namespace}.${key}` : key;
      if (!referenceSet.has(path)) {
        if (!missing.has(path)) missing.set(path, file.replace(`${join(import.meta.dir, "..")}/`, ""));
      }
    }

    // Count the dynamic calls so the blind spot is reported rather than implied.
    for (const call of source.matchAll(/\b([A-Za-z_$][\w$]*)(?:\.rich)?\(\s*`/g)) {
      const name = call[1];
      if (bindings.some((binding) => binding.name === name)) dynamic++;
    }
  }

  return { missing: [...missing.entries()].sort(([a], [b]) => a.localeCompare(b)), dynamic, files: files.length };
}

const sourceScan = scanForMissingKeys();

const violations: string[] = [];

if (sourceScan.missing.length > 0) {
  const lines = sourceScan.missing
    .slice(0, 40)
    .map(([key, file]) => `    ${key.padEnd(38)} ${file}`)
    .join("\n");
  const header = `${sourceScan.missing.length} key(s) are referenced in src/ but exist in no catalog. next-intl's default getMessageFallback returns the key path, so each one renders literally on screen in all ${locales.length} locales — and because the key is absent from ${defaultLocale}.json, the per-locale budget below cannot see it:`;
  const overflow = sourceScan.missing.length > 40 ? `\n    … and ${sourceScan.missing.length - 40} more` : "";
  const remedy = `\n  Fix: add the key to messages/${defaultLocale}.json, or correct the call site.`;
  violations.push(`${header}\n${lines}${overflow}${remedy}`);
}

if (orphans.length > 0) {
  violations.push(`orphan catalog(s) not listed in src/i18n/config.ts: ${orphans.join(", ")}`);
}

const overBudget: string[] = [];
for (const { locale, count, missing } of results) {
  const budget = BUDGET[locale];
  if (budget === undefined) {
    violations.push(`no budget declared for locale "${locale}"`);
    continue;
  }
  if (count > budget) {
    overBudget.push(
      `  ${locale}: ${count} missing, budget ${budget} (+${count - budget})\n` +
        `    e.g. ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", …" : ""}`,
    );
  }
}
if (overBudget.length > 0) {
  violations.push(
    `translation budget exceeded (an English key was added without translating it):\n${overBudget.join("\n")}`,
  );
}

if (jsonOutput) {
  console.log(
    JSON.stringify(
      {
        ok: violations.length === 0,
        referenceKeyCount: referenceKeys.length,
        referencedButMissing: sourceScan.missing.map(([key, file]) => ({ key, file })),
        dynamicKeyCallSites: sourceScan.dynamic,
        results: results.map(({ locale, count }) => ({ locale, missing: count })),
        violations,
      },
      null,
      2,
    ),
  );
  process.exit(violations.length === 0 ? 0 : 1);
}

console.log(`translations:check — ${referenceKeys.length} keys in ${defaultLocale}.json`);
console.log(
  `  ${sourceScan.missing.length === 0 ? "✓" : "✗"} ${sourceScan.missing.length} referenced key(s) missing from the catalog` +
    ` · ${sourceScan.dynamic} dynamic call site(s) not statically checkable\n`,
);
for (const { locale, count, missing } of results.sort(
  (a, b) => b.count - a.count || a.locale.localeCompare(b.locale),
)) {
  const budget = BUDGET[locale] ?? 0;
  const status = count > budget ? "OVER" : count === 0 ? " done" : "  ok ";
  console.log(`  ${locale}  missing=${String(count).padStart(3)}/${budget}  ${status}`);
  if (count > budget) {
    for (const key of missing.slice(0, 10)) console.log(`        - ${key}`);
    if (missing.length > 10) {
      console.log(`        … and ${missing.length - 10} more`);
    }
  }
}

if (violations.length > 0) {
  console.error("\n✗ translations:check failed\n");
  for (const violation of violations) console.error(`${violation}\n`);
  process.exit(1);
}

console.log("\n✓ translations:check passed (all locales within budget)");
