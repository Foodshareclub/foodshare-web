#!/usr/bin/env bun
/**
 * Reports user-facing text in JSX that never went through the catalogue.
 *
 * `translations:check` validates `en.json` against itself and reports keys that
 * no code references. It cannot see this, and neither can anything else here: a
 * hardcoded `>Save<` in a modal renders as "Save" in all 21 locales, and it is
 * not a key anyone referenced, so the reference scan finds nothing to complain
 * about. `tsc` sees a string. A test asserting on rendered text would have to
 * know the string, which means the string is already wrong.
 *
 * So this walks the TypeScript AST, the same way `check-adornments` does for the
 * same reason — the property being checked is a property of the *output*, and no
 * compiler or type can see it.
 *
 * There are ~2,300 of these. That number is the finding, not a wall to be
 * cleared in one pass, so the guard is a per-file ratchet: a file already on the
 * list must not get worse, and a file not on it must have none. Which means a
 * new component with hardcoded text fails, and every file already fixed stays
 * fixed.
 *
 * Excluded, because translating them would be wrong:
 *
 *   - text inside SVG, where a `<title>` and a `<text>` are part of a drawing;
 *   - key hints and symbol runs — "⌘K", "→", "1/2";
 *   - brand and product names used as a single token, where a capital inside the
 *     word is the tell: "Ko-fi" has one, "Save" does not.
 *
 * `--worklist` exists because 2,250 strings is a translation project, not a
 * find-and-replace, and the report is the wrong shape to hand to anyone doing
 * it: a human needs the strings grouped by file, deduplicated, in a file they
 * can edit, with a stable name for each so a key can be agreed before it is
 * written. That is what this emits, and it is the difference between "2,250
 * problems" and a queue.
 *
 * The predicates live in `scripts/lib/user-facing.ts`, shared with
 * `check-i18n-attributes.ts` — because a copy of "is this user-facing English
 * prose" in two files is a copy that drifts, and drift here is silent. The
 * attribute guard finds the other half of what a reader reads: `aria-label`,
 * `placeholder`, `title` and `alt` have no text node at all, and an `aria-label`
 * is read aloud in place of an element's contents.
 *
 * Usage:
 *   bun run check:i18n-text            # the gate
 *   bun run check:i18n-text -- --report
 *   bun run check:i18n-text -- --worklist [-- file-substring]
 *   bun run check:i18n-text -- --write-baseline
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
import ts from "typescript";

import { isUserFacing } from "./lib/user-facing";

const ROOT = process.env.I18N_TEXT_ROOT ?? join(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "check-i18n-text-baseline.json");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

interface Finding {
  file: string;
  line: number;
  text: string;
}

function inspect(file: string): Finding[] {
  const relative = file.replace(`${ROOT}/`, "");
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];

  const visit = (node: ts.Node, insideSvg: boolean) => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (isUserFacing(text, { insideSvg })) {
        findings.push({
          file: relative,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          text: text.length > 70 ? `${text.slice(0, 70)}…` : text,
        });
      }
    }
    const inSvg =
      insideSvg ||
      (ts.isJsxElement(node) &&
        ts.isIdentifier(node.openingElement.tagName) &&
        node.openingElement.tagName.text === "svg");
    ts.forEachChild(node, (child) => visit(child, inSvg));
  };

  visit(source, false);
  return findings;
}

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

if (!existsSync(SRC)) {
  console.error(`  ${RED}No src at ${SRC}${RESET}`);
  process.exit(1);
}

const perFile = new Map<string, number>();
const findings: Finding[] = [];

for (const file of files(SRC)) {
  if (file.includes(".test.") || file.includes(".stories.") || file.includes("emails/templates")) continue;
  const found = inspect(file);
  if (found.length === 0) continue;
  const relative = file.replace(`${ROOT}/`, "");
  perFile.set(relative, found.length);
  findings.push(...found);
}
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const total = findings.length;

if (process.argv.includes("--write-baseline")) {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  const sorted = Object.fromEntries([...perFile].sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `\n${GREEN}✓${RESET} Baseline written: ${total} untranslated string(s) across ${perFile.size} file(s).\n`,
  );
  process.exit(0);
}

if (process.argv.includes("--worklist")) {
  const only = process.argv[process.argv.indexOf("--worklist") + 1];
  const byFile = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (only && !finding.file.includes(only)) continue;
    byFile.set(finding.file, (byFile.get(finding.file) ?? new Set()).add(finding.text));
  }
  for (const [file, texts] of [...byFile].sort()) {
    console.log(`\n${BOLD}${file}${RESET}`);
    for (const text of [...texts].sort()) console.log(`  - ${text}`);
  }
  const totalUnique = [...byFile.values()].reduce((sum, set) => sum + set.size, 0);
  console.log(
    [
      "",
      `  ${totalUnique} unique string(s) across ${byFile.size} file(s).`,
      "  Duplicates are collapsed per file; the same phrase in two files needs two",
      "  keys only if the wording differs in context, and one if it does not.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

console.log(`\n${BOLD}Untranslated text check${RESET}`);

if (process.argv.includes("--report")) {
  let lastFile = "";
  for (const finding of findings) {
    if (finding.file !== lastFile) {
      lastFile = finding.file;
      console.log(`\n  ${BOLD}${finding.file}${RESET}`);
    }
    console.log(`    ${String(finding.line).padStart(5)}  ${finding.text}`);
  }
  console.log(
    [
      "",
      `  ${total} string(s) across ${perFile.size} file(s).`,
      "  Each is rendered verbatim in all 21 locales. Wrap it in t() and add the key.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, number>)
  : null;

if (baseline === null) {
  console.error(
    `  ${RED}No baseline at scripts/check-i18n-text-baseline.json. Create it with:${RESET}\n      bun run check:i18n-text -- --write-baseline\n`,
  );
  process.exit(1);
}

const regressions: string[] = [];
for (const [file, count] of perFile) {
  const before = baseline[file];
  if (before === undefined) {
    regressions.push(`${file} — ${count} new untranslated string(s) in a file that had none`);
  } else if (count > before) {
    regressions.push(`${file} — ${count} now, ${before} in the baseline (+${count - before})`);
  }
}

if (regressions.length > 0) {
  console.error(`\n${RED}${BOLD}Untranslated text check failed${RESET}\n`);
  for (const line of regressions) console.error(`  ${line}`);
  console.error(
    [
      "",
      "  Text in JSX that is not a t() call renders verbatim in all 21 locales.",
      "  This is the half of i18n no compiler can check: the catalogue is sound,",
      "  and a hardcoded string is not a key anyone referenced.",
      "",
      `  ${total} remain overall. The ratchet is per file, so fixing one is permanent`,
      "  and a new component with hardcoded text fails immediately.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const fixed = Object.keys(baseline).filter((file) => perFile.get(file) === undefined).length;
console.log(
  `  ${GREEN}✓${RESET} No file gained untranslated text (${total} remaining across ${perFile.size} file(s)).`,
);
if (fixed > 0) console.log(`  ${GREEN}✓${RESET} ${fixed} file(s) have been fully translated since the baseline.`);
console.log(`  ${YELLOW}·${RESET} Run 'bun run check:i18n-text -- --report' for the list.\n`);
