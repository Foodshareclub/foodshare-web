#!/usr/bin/env bun
/**
 * Reports user-facing **attributes** that never went through the catalogue.
 *
 * `check-i18n-text.ts` walks the same AST and looks at text between JSX tags. It
 * cannot see the other half of what a reader actually reads, because an
 * attribute has no text node at all:
 *
 * ```jsx
 * <button aria-label="Hide password">…</button>
 * <Input placeholder="you@example.com" />
 * <div title="Shared by Ada" />
 * <img alt="FoodShare" />
 * ```
 *
 * The first one is read aloud by a screen reader on every visit to the sign-in
 * page, in English, in all 21 locales. Phase 25 replaced three of them and wrote
 * down that `check-i18n-text` could not have found them — "attributes are not
 * text nodes, and all three are read aloud by a screen reader" — and then did
 * not close the gap. This closes it.
 *
 * The predicates are shared with the other guard through
 * `scripts/lib/user-facing.ts`, because a copy in two files is a copy that
 * drifts, and drift here is silent: a guard that stops reporting is worse than
 * one that never existed, because the baseline still says it is watching.
 *
 * ## Why one guard rather than a rule inside `check-i18n-text`
 *
 * Different exemptions, different worklist, and a different number. The text
 * guard forgives a single-token proper noun standing alone; an attribute does
 * not get that exemption for a *phrase*, so `alt="FoodShare logo"` needs a
 * word-by-word loanword check that would be noise in a text-node guard. Sharing
 * the base rules and keeping the two reports apart is the arrangement where
 * neither has to be weakened to suit the other.
 *
 * ## Ratchet
 *
 * Per file, like the text guard: a file already on the list must not get worse,
 * and a file not on it must have none. **A new component with a hardcoded
 * `aria-label` fails the build immediately**, which is the part that pays for
 * itself — the existing findings are debt, and the next one is not.
 *
 * Usage:
 *   bun run check:i18n-attributes            # the gate
 *   bun run check:i18n-attributes -- --report
 *   bun run check:i18n-attributes -- --worklist [file-substring]
 *   bun run check:i18n-attributes -- --write-baseline
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
import * as ts from "./lib/ts-ast";

import { isUserFacing } from "./lib/user-facing";

const ROOT = process.env.I18N_TEXT_ROOT ?? join(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "check-i18n-attributes-baseline.json");

/**
 * The attributes whose value a reader sees or hears.
 *
 * Each one is a place where prose reaches a person with no text node:
 *
 *   aria-label            the accessible name of a control, announced instead of
 *                         its contents — the most-read string in the app after
 *                         visible text, and the one nothing here could see
 *   aria-description      a longer accessible description
 *   aria-roledescription  replaces the role's name for the user
 *   aria-valuetext        the spoken value of a slider or progress bar
 *   title                 a native tooltip, on hover and on focus
 *   placeholder           shown in an empty field, and used as the label by
 *                         several screen readers when there is no other
 *   alt                   the alternative text for an image
 *
 * Deliberately *not* here: `className`, `href`, `src`, `data-*`, `id`,
 * `autoComplete`, `type`, `name`, `role` and `lang`. Those are identifiers, URLs,
 * markup, or values the browser reads; a letter in any of them is not prose.
 */
const ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
  "title",
  "placeholder",
  "alt",
]);

const paint = (code: number) => (process.env.NO_COLOR ? "" : `\x1b[${code}m`);
const RED = paint(31);
const GREEN = paint(32);
const YELLOW = paint(33);
const BOLD = paint(1);
const DIM = paint(2);
const RESET = paint(0);

interface Finding {
  file: string;
  line: number;
  attribute: string;
  text: string;
}

const truncate = (text: string) => (text.length > 70 ? `${text.slice(0, 70)}…` : text);

/** The literal value of a JSX attribute, or null if it is not a literal. */
const literal = (attribute: ts.JsxAttribute): string | null => {
  const { initializer } = attribute;
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  // `aria-label={"Hide password"}` — braces around a string literal.
  if (ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteral(initializer.expression))
    return initializer.expression.text;
  return null;
};

async function inspect(file: string): Promise<Finding[]> {
  const relative = file.replace(`${ROOT}/`, "");
  const { sourceFile, lineOf } = await ts.parseSourceFile(file, readFileSync(file, "utf8"));
  const findings: Finding[] = [];

  const visit = (node: ts.Node, insideSvg: boolean) => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      if (ATTRIBUTES.has(name)) {
        const value = literal(node);
        const text = value?.replace(/\s+/g, " ").trim() ?? "";
        if (text && isUserFacing(text, { insideSvg })) {
          findings.push({
            file: relative,
            line: lineOf(node),
            attribute: name,
            text: truncate(text),
          });
        }
      }
    }
    const inSvg =
      insideSvg ||
      (ts.isJsxElement(node) &&
        ts.isIdentifier(node.openingElement.tagName) &&
        node.openingElement.tagName.text === "svg");
    ts.forEachChild(node, (child) => visit(child, inSvg));
  };

  visit(sourceFile, false);
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
  await ts.closeAstClient();
  process.exit(1);
}

const perFile = new Map<string, number>();
const byAttribute: Record<string, number> = {};
const findings: Finding[] = [];

for (const file of files(SRC)) {
  if (file.includes(".test.") || file.includes(".stories.") || file.includes("emails/templates")) continue;
  const found = await inspect(file);
  if (found.length === 0) continue;
  const relative = file.replace(`${ROOT}/`, "");
  perFile.set(relative, found.length);
  for (const f of found) byAttribute[f.attribute] = (byAttribute[f.attribute] ?? 0) + 1;
  findings.push(...found);
}
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const total = findings.length;

if (process.argv.includes("--write-baseline")) {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  const sorted = Object.fromEntries([...perFile].sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `\n${GREEN}✓${RESET} Baseline written: ${total} untranslated attribute(s) across ${perFile.size} file(s).\n`,
  );
  await ts.closeAstClient();
  process.exit(0);
}

if (process.argv.includes("--worklist")) {
  const only = process.argv[process.argv.indexOf("--worklist") + 1];
  const grouped = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (only && !finding.file.includes(only)) continue;
    const line = `${finding.attribute}="${finding.text}"`;
    grouped.set(finding.file, (grouped.get(finding.file) ?? new Set()).add(line));
  }
  for (const [file, values] of [...grouped].sort()) {
    console.log(`\n${BOLD}${file}${RESET}`);
    for (const value of [...values].sort()) console.log(`  - ${value}`);
  }
  const unique = [...grouped.values()].reduce((sum, set) => sum + set.size, 0);
  console.log(
    [
      "",
      `  ${unique} unique attribute(s) across ${grouped.size} file(s).`,
      "  The attribute is named because an aria-label and a placeholder are not",
      "  the same string with a different wrapper — an accessible name has to read",
      "  as a name, and a placeholder has to read as an example.",
      "",
    ].join("\n"),
  );
  await ts.closeAstClient();
  process.exit(0);
}

console.log(`\n${BOLD}Untranslated attribute check${RESET}`);
console.log(`  ${DIM}${ATTRIBUTES.size} attribute(s) watched, ${perFile.size} file(s) with findings${RESET}\n`);

if (process.argv.includes("--report")) {
  let lastFile = "";
  for (const finding of findings) {
    if (finding.file !== lastFile) {
      lastFile = finding.file;
      console.log(`\n  ${BOLD}${finding.file}${RESET}`);
    }
    console.log(
      `    ${String(finding.line).padStart(5)}  ${DIM}${finding.attribute.padEnd(20)}${RESET}${finding.text}`,
    );
  }
  console.log(
    [
      "",
      `  ${total} attribute(s) across ${perFile.size} file(s).`,
      ...Object.entries(byAttribute)
        .sort((a, b) => b[1] - a[1])
        .map(([attribute, count]) => `    ${String(count).padStart(4)} ${attribute}`),
      "",
      "  Each renders verbatim in all 21 locales, and an aria-label is read aloud.",
      "",
    ].join("\n"),
  );
  await ts.closeAstClient();
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, number>)
  : null;

if (baseline === null) {
  console.error(
    `  ${RED}No baseline at scripts/check-i18n-attributes-baseline.json. Create it with:${RESET}\n      bun run check:i18n-attributes -- --write-baseline\n`,
  );
  await ts.closeAstClient();
  process.exit(1);
}

const regressions: string[] = [];
for (const [file, count] of perFile) {
  const before = baseline[file];
  if (before === undefined) {
    regressions.push(`${file} — ${count} new untranslated attribute(s) in a file that had none`);
  } else if (count > before) {
    regressions.push(`${file} — ${count} now, ${before} in the baseline (+${count - before})`);
  }
}

if (regressions.length > 0) {
  console.error(`\n${RED}${BOLD}Untranslated attribute check failed${RESET}\n`);
  for (const line of regressions) console.error(`  ${line}`);
  console.error(
    [
      "",
      "  An aria-label is read aloud by a screen reader in place of the element's",
      "  contents, so a hardcoded one is not a cosmetic defect — it is the",
      "  accessible name, in English, on every visit, in all 21 locales.",
      "",
      `  ${total} remain overall. The ratchet is per file, so fixing one is permanent`,
      "  and a new component with a hardcoded aria-label fails immediately.",
      "",
    ].join("\n"),
  );
  await ts.closeAstClient();
  process.exit(1);
}

const fixed = Object.keys(baseline).filter((file) => perFile.get(file) === undefined).length;
console.log(
  `  ${GREEN}✓${RESET} No file gained an untranslated attribute (${total} remaining across ${perFile.size} file(s)).`,
);
if (fixed > 0)
  console.log(
    `  ${GREEN}✓${RESET} ${fixed} file(s) are clear since the baseline, of ${Object.keys(baseline).length} recorded.`,
  );
console.log(`  ${YELLOW}·${RESET} Run 'bun run check:i18n-attributes -- --report' for the list.\n`);

// The compiler process is a child, and it keeps the event loop alive. Without
// this the script prints its result and then hangs.
await ts.closeAstClient();
