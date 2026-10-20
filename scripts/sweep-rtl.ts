#!/usr/bin/env bun
/**
 * Swaps physical direction utilities for logical ones, and refuses to swap the
 * ones where that is wrong.
 *
 * There were 405 physical utilities across 173 files when this started. A blind
 * find-and-replace over that is how you ship a silent visual regression: a
 * `pl-2` becomes `ps-2`, which is right, and a `left-1/2` becomes `start-1/2`,
 * which moves the element and is not.
 *
 * So the codemod is split along the only line that matters.
 *
 *   **Mechanical** — spacing, alignment, borders, radii. `ml-2` -> `ms-2`,
 *   `text-left` -> `text-start`, `border-l` -> `border-s`. The logical utility
 *   exists, carries the same value, and moves with the document. These are
 *   applied in bulk.
 *
 *   **Manual** — insets and transforms. `left-4` is `start-4` only when the
 *   element is meant to hug the inline start; against a physical parent, or
 *   paired with a slide animation, or as half of the centring idiom
 *   `left-1/2 -translate-x-1/2`, it is a different decision every time. Those
 *   are listed and left alone.
 *
 * The reason the mechanical half is safe to trust is `scripts/check-classes.ts`:
 * it compiles the stylesheet and proves every resulting class emits a rule. A
 * swap to a utility that does not exist is caught by the build rather than by
 * whoever opens the page.
 *
 * Usage:
 *   bun run sweep:rtl            # dry run, prints the plan
 *   bun run sweep:rtl -- --write # apply the mechanical half
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/**
 * The mechanical swaps, as `[physical, logical]` on the bare utility.
 *
 * Order is irrelevant because each is anchored at a class boundary, and the
 * patterns run once per match. `text-align` is absent on purpose: it is a CSS
 * property, not a class, and `-left` without a boundary would have matched it.
 */
/**
 * The mechanical swaps.
 *
 * The replacement is a function because a negative margin has to keep its sign:
 * `-ml-[100%]` becomes `-ms-[100%]`, and a fixed replacement would drop the
 * minus. A lookbehind that refuses to match after a `-` skips negatives
 * silently, which is the same bug as not sweeping them at all — it looks
 * complete and is not. Nine files use them.
 */
type Replacer = (match: RegExpExecArray) => string;

const SPACING: Record<string, string> = {
  ml: "ms",
  mr: "me",
  pl: "ps",
  pr: "pe",
};

const MECHANICAL: Array<[RegExp, Replacer]> = [
  // `(-?)(ml|mr|pl|pr)-` — the sign is captured, the utility is mapped. The
  // lookahead stops the match at the name so the value is never inspected.
  [/(?<![-\w])(-?)(ml|mr|pl|pr)-(?=[^\s"'`])/g, (m) => `${m[1]}${SPACING[m[2]]}-`],
  [/(?<![-\w])text-left(?![-\w])/g, () => "text-start"],
  [/(?<![-\w])text-right(?![-\w])/g, () => "text-end"],
  // `border-l`, `border-l-2`, `border-l-primary`, and the `!` important form.
  //
  // The lookahead is `(?![a-z0-9])`, not `(?![-\w])`. The stricter form looks
  // right and silently skips every suffixed value, because `-` is in the
  // excluded set — so it matched bare `border-l` and never `border-l-4` or
  // `rounded-l-full`. Fourteen uses of suffixed border and radius utilities were
  // reported as swept while going untouched, and the summary said "2 border-r"
  // rather than the eleven the tree contains.
  [/(?<![-\w])border-l(?![a-z0-9])/g, () => "border-s"],
  [/(?<![-\w])border-r(?![a-z0-9])/g, () => "border-e"],
  [/(?<![-\w])rounded-l(?![a-z0-9])/g, () => "rounded-s"],
  [/(?<![-\w])rounded-r(?![a-z0-9])/g, () => "rounded-e"],
  // A symmetric pair pins both edges, so it is direction-neutral by definition
  // and `inset-x-*` says so. `left-0 right-0` on a fixed overlay, `left-2
  // right-2` on a full-bleed band. Only the matching value is taken, so
  // `left-2 right-4` — genuinely asymmetric — is left for review.
  // The replacer reads `m[1]` rather than destructuring. A replacer is called as
  // `replace(match)` with a single RegExpExecArray, so `(_m, v) => …` binds `v`
  // to `undefined` — only `String.replace` spreads the array. That produced
  // `inset-x-0` for every pair, including `left-3 right-3`, and looked entirely
  // plausible in the dry run.
  [/(?<![-\w])left-([0-9][^\s"'`]*)?\s+right-\1(?![a-z0-9])/g, (m) => `inset-x-${m[1] ?? "0"}`],
  // A corner offset, but only in the paired form `-top-N -right-N`. The vertical
  // offset is what makes it a corner rather than a bare inset, and a bare
  // `-right-1` is a judgement call this script should not make. Twenty-nine
  // uses, and they are two families: notification badges hugging the corner of
  // an avatar, and the pair of decorative blobs on opposite corners. Both
  // mirror, and for the blob pairs mirroring keeps the diagonal balanced — a
  // top-right and a bottom-left become a top-left and a bottom-right.
  [/(?<![-\w])(-top-[\d.]+|-bottom-[\d.]+) -right-([\d.]+)/g, (m) => `${m[1]} -end-${m[2]}`],
  [/(?<![-\w])(-top-[\d.]+|-bottom-[\d.]+) -left-([\d.]+)/g, (m) => `${m[1]} -start-${m[2]}`],
  // A vertically centred adornment pinned to the inline start of a relatively
  // positioned field: `absolute left-3 top-1/2 -translate-y-1/2`, twenty times
  // over, every one a search magnifier or a form label beside an input whose own
  // padding is already `ps-*`. The vertical half is what identifies it — a bare
  // `left-3` could be anything, but an element centred on the block axis and
  // offset from the inline start is a leading adornment in all twenty.
  //
  // The negative lookahead is not decoration. The card-deck swipe indicator has
  // the identical prefix and is *not* one of these: it carries a further
  // `-translate-x-16` and moves with a touch gesture, so its edge is physical in
  // every locale. Without the lookahead the rule swept it and the comment above
  // claimed it had not.
  [
    /(?<![-\w])absolute left-([\d.]+) top-1\/2 -translate-y-1\/2(?![^\n]{0,40}?-translate-x-)/g,
    (m) => `absolute start-${m[1]} top-1/2 -translate-y-1/2`,
  ],
];

/**
 * The manual half, reported and never touched.
 *
 * Each pattern is the *shape* that makes a swap unsafe rather than the token
 * itself, so the report is a work list rather than a duplicate of the RTL
 * guard's. `border-l` is absent here: it is mechanical, and a border on the
 * inline start is right in RTL.
 */
const MANUAL: Array<[string, RegExp]> = [
  ["centring idiom", /(?<![-\w])left-1\/2(?![-\w])/g],
  ["translate-x", /(?<![-\w])-translate-x-(?=[^\s"'`])/g],
  ["inset", /(?<![-\w])(?:left|right)-(?=[^\s"'`])/g],
];

interface Change {
  file: string;
  from: string;
  to: string;
}

/** Blank out comments while preserving offsets, so a doc example is never edited. */
function stripComments(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
      // A line comment is blanked to its *end*, not just past the two slashes.
      // `^\s*(\/\/)` replaced the marker and left the rest of the line readable,
      // so a physical utility named in a `//` comment was reported as a real
      // violation — which is exactly what happened the first time a comment
      // mentioned `-translate-x-full` to explain a fix. The `/* */` form was
      // already correct, so the bug only surfaced for line comments.
      .replace(/^\s*\/\/.*$/gm, (line) => " ".repeat(line.length))
  );
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(?:tsx|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const write = process.argv.includes("--write");
const changes: Change[] = [];
const manual: Array<[string, string]> = [];

interface Swapped {
  start: number;
  end: number;
  to: string;
}

for (const file of sourceFiles(SRC)) {
  const original = readFileSync(file, "utf8");
  // Comments are blanked so a usage example is never edited, but the blanking
  // preserves length, so every offset still points at the same place.
  const editable = stripComments(original);
  const relative = file.replace(`${ROOT}/`, "");

  const swaps: Swapped[] = [];
  for (const [pattern, replace] of MECHANICAL) {
    for (const match of editable.matchAll(pattern)) {
      swaps.push({ start: match.index, end: match.index + match[0].length, to: replace(match) });
    }
  }
  swaps.sort((a, b) => a.start - b.start);

  // Rebuild from the original with a cursor. Splicing in place does not work
  // here: `text-left` -> `text-start` changes the length, so every offset after
  // the first swap is wrong, and the second swap lands in the middle of a token.
  // `token.replace(pattern.source, …)` is worse still — `pattern.source` is the
  // regex *text* including its lookarounds, so the search finds nothing and the
  // "replacement" is the original token. The first dry run reported
  // `mr- -> mr-`, 151 times, and looked plausible enough to be worth checking.
  let swept = "";
  let cursor = 0;
  for (const swap of swaps) {
    if (swap.start < cursor) continue; // overlapped a previous match
    swept += original.slice(cursor, swap.start) + swap.to;
    cursor = swap.end;
    changes.push({ file: relative, from: original.slice(swap.start, swap.end), to: swap.to });
  }
  swept += original.slice(cursor);

  for (const [, pattern] of MANUAL) {
    for (const match of editable.matchAll(pattern)) {
      manual.push([relative, match[0]]);
    }
  }

  if (swept !== original && write) writeFileSync(file, swept);
}

const byPair = new Map<string, number>();
for (const change of changes) {
  const key = `${change.from}  ->  ${change.to}`;
  byPair.set(key, (byPair.get(key) ?? 0) + 1);
}
const files = new Set(changes.map((change) => change.file));

console.log(`\n${BOLD}RTL sweep${RESET}`);

if (changes.length === 0) {
  console.log(`  ${GREEN}✓${RESET} Nothing mechanical left to swap.`);
} else {
  console.log(
    `  ${write ? GREEN : YELLOW}${changes.length}${RESET} mechanical swap(s) across ` +
      `${BOLD}${files.size}${RESET} file(s)${write ? "" : " (dry run)"}\n`,
  );
  for (const [pair, count] of [...byPair].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(count).padStart(4)}  ${pair}`);
  }
}

const manualByFile = new Map<string, Set<string>>();
for (const [file, token] of manual) {
  manualByFile.set(file, (manualByFile.get(file) ?? new Set()).add(token));
}

console.log(
  [
    "",
    `  ${BOLD}Left for review${RESET}  ${manual.length} inset/transform use(s) in ` + `${manualByFile.size} file(s).`,
    "  These are not mechanical: `left-4` is `start-4` only when the element is meant to hug",
    "  the inline start, and `left-1/2 -translate-x-1/2` is centring, where swapping either half",
    "  moves the element. `bun run check:rtl -- --report` lists them by file.",
    "",
  ].join("\n"),
);

if (write && changes.length > 0) {
  console.log(
    [
      `  ${GREEN}\u2713${RESET} Swept. Now prove it: \`bun run check:classes\` compiles the stylesheet`,
      "    and fails on any class that does not emit — which is what would happen if a swap",
      "    landed on a utility that does not exist.",
      "",
    ].join("\n"),
  );
}
