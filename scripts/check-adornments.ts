#!/usr/bin/env bun
/**
 * Catches a half-converted adornment: a container reserving logical padding for
 * a trailing glyph that is anchored physically.
 *
 * This is the one RTL defect that a class-string scan cannot see, and it has now
 * appeared four times, which is twice more than justifies leaving it to the eye:
 *
 *     <div className="relative">
 *       <Input className="pe-12" />                          // reserves the end
 *       <button className="absolute right-2 top-1/2" />     // anchored right
 *     </div>
 *
 * In LTR those two agree — `pe-12` resolves to the right and `right-2` is the
 * right — so the markup looks finished and every gate passes. In RTL the padding
 * moves to the left and the glyph stays put, so the button sits on top of the
 * text it was meant to sit beside. `right-2` should be `end-2`, and the pair then
 * agrees in both.
 *
 * A regex over class strings cannot catch it, because the two classes are on
 * *different elements* and the only thing connecting them is their parent. So
 * this walks the TypeScript AST, which is already a dependency, and for each
 * positioned adornment looks for a sibling subtree that reserves padding on the
 * corresponding logical side.
 *
 * What it deliberately does not report:
 *
 *   - an adornment in a container that reserves no padding at all. A corner
 *     badge, a scrollbar control, a close button. Nothing to disagree with.
 *   - padding on both sides. Two adornments, or an adornment plus text; there is
 *     no single correct answer to check against.
 *   - an adornment already written logically. That is the point.
 *
 * Usage:
 *   bun run check:adornments            # the gate
 *   bun run check:adornments -- --report
 *   bun run check:adornments -- --write-baseline
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
import * as ts from "./lib/ts-ast";

const ROOT = process.env.ADORNMENT_CHECK_ROOT ?? join(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "check-adornments-baseline.json");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/**
 * A physical inset or logical padding at a leading or trailing side, value
 * included — a report that says "right- beside pe-" is not actionable.
 */
const VALUE = "(?:\\d+(?:\\.\\d+)?|\\[[^\\]]*\\]|px)";
const TRAILING_INSET = new RegExp(`(?<![\\w-])right-${VALUE}`, "g");
const LEADING_INSET = new RegExp(`(?<![\\w-])left-${VALUE}`, "g");
const TRAILING_PADDING = new RegExp(`(?<![\\w-])pe-${VALUE}`, "g");
const LEADING_PADDING = new RegExp(`(?<![\\w-])ps-${VALUE}`, "g");
/**
 * Only `absolute`.
 *
 * An absolutely positioned element's containing block is its nearest positioned
 * ancestor, which is what makes it a sibling of the padding. A `fixed` element
 * has no such relationship — it is positioned against the viewport — so a
 * floating control next to some deeply nested `ps-10` is not a finding, and
 * treating it as one put two false positives in the first report: a `fixed
 * bottom-4 left-4` mobile toggle and a `fixed top-0 left-0` sidebar drawer, both
 * matched against padding ninety lines below them and entirely unrelated.
 */
const POSITIONED = /\babsolute\b/;

/** A class that establishes a containing block for its absolute descendants. */
const ESTABLISHES_BLOCK = /\b(?:relative|absolute)\b/;

/** The opening element, whichever JSX form it takes. */
function openingOf(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

function classNameAttributeOf(node: ts.Node): ts.JsxAttribute | undefined {
  const opening = openingOf(node);
  if (!opening) return undefined;
  return ts
    .jsxAttributes(opening)
    .find(
      (property): property is ts.JsxAttribute =>
        ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === "className",
    );
}

/** The className strings of an element: the attribute, and anything in `cn(…)`. */
function classNamesOf(node: ts.Node): string[] {
  const attribute = classNameAttributeOf(node);
  if (!attribute) return [];

  const found: string[] = [];
  const initializer = attribute.initializer;

  if (initializer && ts.isStringLiteral(initializer)) {
    found.push(initializer.text);
  } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
    // A `cn("…", cond && "…")` spread over several lines, or a template literal
    // with static text, both come out of the expression as string literals.
    const expression = initializer.expression.getText();
    for (const match of expression.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
      found.push((match[1] ?? match[2] ?? match[3] ?? "").replace(/\$\{[^}]*\}/g, " "));
    }
  }

  return found.filter(Boolean);
}

/**
 * Does the adornment's side have padding reserved on it?
 *
 * Two earlier rules, and both were wrong in a way that hid a real bug:
 *
 *   - "exactly one side is padded" threw away the select item, which is padded
 *     on both sides with the asymmetry carrying the whole signal.
 *   - "the larger value is the reserved side" then fixed that and broke a search
 *     field with `ps-11 pe-10` and *two* adornments, one at each end. 11 is not
 *     meaningfully larger than 10; both sides are reserved and comparing them
 *     decides nothing.
 *
 * So the question is not which side is reserved — it is whether the adornment's
 * own side has padding, because that is the pair that agrees in LTR and diverges
 * in RTL. No comparison is needed except one: symmetric padding reserves
 * nothing, so `ps-4 pe-4` is left alone whatever the adornments do.
 */
function reservesFor(side: "leading" | "trailing", leading: string, trailing: string): boolean {
  if (side === "leading" && !leading) return false;
  if (side === "trailing" && !trailing) return false;
  if (!leading || !trailing) return true; // only one side padded, so it is this one

  const lead = Number(leading.slice(leading.indexOf("-") + 1));
  const trail = Number(trailing.slice(trailing.indexOf("-") + 1));
  // Equal — or a value either side cannot read — is a symmetric container.
  return Number.isFinite(lead) && Number.isFinite(trail) ? lead !== trail : false;
}

interface Finding {
  file: string;
  line: number;
  adornment: string;
  side: "leading" | "trailing";
  padding: string;
}

async function inspect(file: string): Promise<Finding[]> {
  const relative = file.replace(`${ROOT}/`, "");
  const { sourceFile, lineOf } = await ts.parseSourceFile(file, readFileSync(file, "utf8"));
  const findings: Finding[] = [];

  const openers: ts.Node[] = [];
  const collect = (node: ts.Node) => {
    if (openingOf(node) && classNameAttributeOf(node)) openers.push(node);
    ts.forEachChild(node, collect);
  };
  collect(sourceFile);

  for (const node of openers) {
    const own = classNamesOf(node).join(" ");
    if (!POSITIONED.test(own)) continue;

    // `test` on a global regex advances `lastIndex`, so each one is reset or
    // built fresh. Leaving them shared is a ratchet that reports differently
    // depending on what it saw before, which is the same class of bug as the
    // rest of this.
    const matches = (pattern: RegExp) => {
      pattern.lastIndex = 0;
      return own.match(pattern)?.[0] ?? "";
    };
    const trailing = matches(TRAILING_INSET) !== "";
    const leading = matches(LEADING_INSET) !== "";
    if (trailing === leading) continue; // neither, or both — no single answer

    const side = trailing ? "trailing" : "leading";
    const adornment = trailing ? matches(TRAILING_INSET) : matches(LEADING_INSET);

    // The nearest *positioned* ancestor, and only its subtree. Searching the
    // nearest JSX ancestor of any kind reached past a positioned wrapper and
    // paired an adornment with padding belonging to a different part of the
    // page.
    let parent = node.parent;
    while (parent && !(openingOf(parent) && ESTABLISHES_BLOCK.test(classNamesOf(parent).join(" ")))) {
      parent = parent.parent;
    }
    if (!parent) continue;

    let leadingPadding = "";
    let trailingPadding = "";

    // The containing block's *own* padding counts, not only its children's. A
    // select item is `relative … ps-1.5 pe-8` and the checkmark is a child of
    // it, so the reservation lives on the parent — and a walk that started at
    // the parent's children never saw it. The auth cases passed anyway because
    // there the padding is on a sibling, which is why the gap was invisible
    // until a case with the padding on the parent came along.
    const consider = (node: ts.Node) => {
      for (const value of classNamesOf(node)) {
        if (!trailingPadding) {
          TRAILING_PADDING.lastIndex = 0;
          trailingPadding = value.match(TRAILING_PADDING)?.[0] ?? "";
        }
        if (!leadingPadding) {
          LEADING_PADDING.lastIndex = 0;
          leadingPadding = value.match(LEADING_PADDING)?.[0] ?? "";
        }
      }
    };

    consider(parent);
    const walk = (descendant: ts.Node) => {
      consider(descendant);
      ts.forEachChild(descendant, walk);
    };
    ts.forEachChild(parent, walk);

    if (reservesFor(side, leadingPadding, trailingPadding)) {
      findings.push({
        file: relative,
        line: lineOf(node),
        adornment,
        side,
        padding: side === "trailing" ? trailingPadding : leadingPadding,
      });
    }
  }

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

const findings: Finding[] = [];
for (const file of files(SRC)) {
  if (file.includes(".test.") || file.includes(".stories.")) continue;
  findings.push(...(await inspect(file)));
}
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (process.argv.includes("--write-baseline")) {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ total: findings.length }, null, 2)}\n`);
  console.log(`\n${GREEN}✓${RESET} Baseline written: ${findings.length} finding(s).\n`);
  await ts.closeAstClient();
  process.exit(0);
}

console.log(`\n${BOLD}Adornment alignment check${RESET}`);

if (process.argv.includes("--report")) {
  for (const finding of findings) {
    console.log(`  ${finding.file}:${finding.line}  ${finding.adornment} beside ${finding.padding}`);
  }
  console.log(
    [
      "",
      `  ${findings.length} finding(s). The inset is on the physical side the padding`,
      "  resolves to in LTR, and they diverge in RTL. Use start-/end-.",
      "",
    ].join("\n"),
  );
  await ts.closeAstClient();
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as { total: number })
  : null;

if (baseline === null) {
  console.error(
    `  ${RED}No baseline at scripts/check-adornments-baseline.json. Create it with:${RESET}\n      bun run check:adornments -- --write-baseline\n`,
  );
  await ts.closeAstClient();
  process.exit(1);
}

if (findings.length > baseline.total) {
  console.error(`\n${RED}${BOLD}Adornment alignment check failed${RESET}\n`);
  console.error(`  ${findings.length} finding(s) against a baseline of ${baseline.total}.\n`);
  for (const finding of findings) {
    console.error(`    ${finding.file}:${finding.line}  ${finding.adornment} beside ${finding.padding}`);
  }
  // No per-finding value here: the message is general, and reaching back into
  // the last element of the loop to fill it in reads as if it described them all.
  console.error(
    [
      "",
      "  A container reserving logical padding for a glyph anchored at a physical inset",
      "  agrees in LTR and diverges in RTL, which is the hardest kind of direction bug to",
      "  see: the markup looks finished in the locale you develop in.",
      "",
    ].join("\n"),
  );
  await ts.closeAstClient();
  process.exit(1);
}

console.log(
  `  ${GREEN}✓${RESET} No half-converted adornments (${findings.length} finding(s), baseline ${baseline.total}).`,
);
console.log(`  ${YELLOW}·${RESET} Run 'bun run check:adornments -- --report' for the list.\n`);

// The compiler process is a child, and it keeps the event loop alive. Without
// this the script prints its result and then hangs.
await ts.closeAstClient();
