#!/usr/bin/env bun
/**
 * Finds class names the app uses that Tailwind never emits a rule for.
 *
 * Class names are strings. `tsc` cannot check one, `oxlint` cannot check one, and
 * a test asserting on a `className` asserts that someone typed the letters — not
 * that a declaration exists. So a typo, a v3 name, or a utility that simply does
 * not exist produces a component that looks styled in the editor and renders
 * unstyled in the browser, and every gate in this repo passes.
 *
 * That is not hypothetical here. This script was written because the forum's
 * rich text is passed 30 `prose*` classes and `@tailwindcss/typography` is not a
 * dependency, so all 30 emit nothing: headings, lists, blockquotes and code
 * blocks render with browser defaults.
 *
 * Two things keep the report worth reading:
 *
 *   1. Only literals in *class position* are considered — the arguments of
 *      `cn(`/`clsx`/`twMerge`/`cva` and the value of a `className` prop. Every
 *      token in a file is a candidate otherwise, and `data-icon="x"` and the
 *      word "auto-detects" in a paragraph are not classes.
 *   2. A candidate is only reported if it shares a *namespace* with something
 *      that did emit, so `border-s-primary` is interesting beside `border-s-2`
 *      and the word "button" is not.
 *
 * The second rule is a real limitation and worth stating plainly: a class is
 * invisible if *nothing* in its namespace emits. The email templates and the
 * Leaflet marker markup carry real class names that Tailwind will never see —
 * `aws_ses` in a table cell, `cluster-marker` in a div — and without this rule
 * they drown the report. The cost is that a component using only invented
 * classes in one namespace can pass. Every instance found in this codebase had a
 * live sibling, so the rule has not hidden anything here, but it is a gap and
 * not a proof.
 *
 * Usage:
 *   bun run check:classes            # the gate
 *   bun run check:classes -- --report
 *   bun run check:classes -- --write-baseline
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join } from "bun:path";
import tailwind from "@tailwindcss/postcss";
import postcss, { type Rule } from "postcss";

const ROOT = process.env.CLASS_CHECK_ROOT ? process.env.CLASS_CHECK_ROOT : join(import.meta.dir, "..");
const STYLESHEET = join(ROOT, "src", "app", "globals.css");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "check-classes-baseline.json");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/** Blank out comments, preserving offsets. */
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

/** The span from an opening bracket to its match, skipping strings and comments. */
function balancedEnd(source: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const stack: string[] = [pairs[source[open]]];
  let index = open + 1;

  while (index < source.length && stack.length > 0) {
    const char = source[index];

    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      index += 1;
      while (index < source.length && source[index] !== quote) index += source[index] === "\\" ? 2 : 1;
    } else if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index);
      index = close === -1 ? source.length : close + 2;
    } else if (char === "(" || char === "{" || char === "[") {
      stack.push(pairs[char]);
    } else if (char === stack[stack.length - 1]) {
      stack.pop();
    }

    index += 1;
  }
  return index;
}

/**
 * A string literal immediately followed by `:` is an object key, and a key in a
 * `cva` `variants` map is the name of a variant — `brand-orange`, `accent-orange`
 * — not a class. Reading those as classes reported six phantom dead classes.
 */
const OBJECT_KEY = /\s*:/;

/** The spans of `${ … }` in a template literal, with braces counted. */
function interpolationSpans(body: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < body.length - 1; i += 1) {
    if (body[i] !== "$" || body[i + 1] !== "{") continue;
    let depth = 1;
    let j = i + 2;
    while (j < body.length && depth > 0) {
      if (body[j] === "{") depth += 1;
      else if (body[j] === "}") depth -= 1;
      j += 1;
    }
    spans.push([i, j]);
    i = j - 1;
  }
  return spans;
}

/** Quoted string bodies in a span: `"…"`, `'…'`, and the static parts of `…`. */
function quotedText(source: string, from: number, to: number): string[] {
  const span = source.slice(from, to);
  const found: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:[^`\\]|\\.)*)`/g;
  for (const match of span.matchAll(re)) {
    if (OBJECT_KEY.test(span.slice(match.index + match[0].length, match.index + match[0].length + 40))) {
      continue;
    }
    const body = match[1] ?? match[2] ?? match[3] ?? "";
    if (match[1] !== undefined || match[2] !== undefined) {
      found.push(body);
      continue;
    }
    found.push(staticOnly(body));
  }
  return found;
}

/**
 * The statically knowable text of a template literal.
 *
 * A template literal's static text is knowable; its interpolations are not.
 * Two things follow, and both were real false positives:
 *   - a literal *inside* `${ … }` is a runtime value (`"end"`, `"auto"`), and a
 *     non-greedy `\$\{[^}]*\}` missed them whenever the expression nested an
 *     object or a JSX element;
 *   - a static run that ends in `-` right before an interpolation is a dynamic
 *     prefix — `cluster-${size}`, `text-${tone}` — and the bare prefix is not a
 *     class.
 *
 * The `className` prop and the `cn(` arguments must both go through here. They
 * did not at first: the prop path blanked interpolations with a regex and
 * reported `cluster-` from `class="cluster-marker cluster-${size}"`, which is
 * Leaflet's marker markup and not a Tailwind class at all.
 */
function staticOnly(body: string): string {
  {
    // Two things follow, and both were real false positives:
    //   - a literal *inside* `${ … }` is a runtime value (`"end"`, `"auto"`),
    //     and `\$\{[^}]*\}` missed them whenever the expression nested an object
    //     or a JSX element;
    //   - a static run that ends in `-` right before an interpolation is a
    //     dynamic prefix — `cluster-${size}`, `text-${tone}` — and the bare
    //     prefix is not a class.
    let out = "";
    let cursor = 0;
    for (const [from, to] of interpolationSpans(body)) {
      let run = body.slice(cursor, from);
      // Only a token *glued* to the interpolation is dynamic: a trailing space
      // means the previous token is complete, so `flex ${x}` keeps `flex`. The
      // mirror case is the same token's tail — `text-${size}-500` leaves `-500`.
      run = run.replace(/[^\s]*[-][^\s]*$/, "");
      if (cursor === 0) run = run.replace(/^[^\s]*[-]/, "");
      out += `${run} `;
      cursor = to;
    }
    out += body.slice(cursor);
    return out;
  }
}

const CLASS_CALL = /\b(?:cn|clsx|twMerge|cva)\s*\(/g;
const CLASS_PROP = /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|`((?:[^`\\]|\\.)*)`|\{)/g;

/**
 * The text of every string literal sitting in class position.
 *
 * Region-based, not adjacency-based, and that distinction is the tool. A `cn(`
 * call spread over six lines holds five literals and only the first is preceded
 * by `cn(`; matching a marker against the preceding characters found one of six
 * and dropped every `prose-*` class the report exists to surface.
 */
function classLiterals(source: string): string[] {
  const scannable = stripComments(source);
  const literals: string[] = [];

  for (const match of scannable.matchAll(CLASS_CALL)) {
    const open = scannable.indexOf("(", match.index);
    const open2 = open;
    literals.push(...quotedText(scannable, open2 + 1, balancedEnd(scannable, open2)));
  }

  for (const match of scannable.matchAll(CLASS_PROP)) {
    const direct = match[1] ?? match[2] ?? match[3];
    if (direct !== undefined) {
      literals.push(staticOnly(direct));
      continue;
    }
    const brace = match.index + match[0].length - 1;
    literals.push(...quotedText(scannable, brace + 1, balancedEnd(scannable, brace)));
  }

  return literals;
}

/**
 * The namespace a candidate belongs to: the utility root, past any variant,
 * important flag and negative sign, cut at the first `-`, digit or bracket.
 */
function namespaceOf(candidate: string): string {
  const root = candidate
    .replace(/^(?:\[[^\]]*\]|[a-z][\w-]*):/, "")
    .replace(/^[-!]+/, "")
    .replace(/^[/()]/, "")
    .replace(/[/)]$/, "");
  const cut = root.search(/[-[0-9]/);
  return cut === -1 ? root : root.slice(0, cut);
}

/**
 * Classes Tailwind deliberately emits no rule for.
 *
 * `group` and `peer` are markers: they exist to be *targeted* by the `group-*`
 * and `peer-*` variants, and carry no declarations of their own. Their absence
 * from the output is the design, so reporting them would be noise on every run.
 */
const MARKER_CLASSES = /^(?:group|peer)(?:\/[^\s]+)?$/;

/**
 * Tokens that cannot be a class, whatever literal they came from.
 *
 * Inside a `cn(` call a string literal is not necessarily a class. Two shapes
 * showed up here, and both need a real parser to exclude properly:
 *
 *   - a comparison operand: `side === "right" && "end-0"` puts the word `right`
 *     in the same region as the utility;
 *   - a replacement needle: `tierConfig.color.replace("text-", "ring-")` puts
 *     two bare namespace prefixes in a class region, and neither is a class.
 *
 * Both are excluded by shapes no utility can take, so nothing is lost:
 *
 *   - a single lowercase word is never dead, because the bare-word utilities
 *     (`flex`, `hidden`, `truncate`) all emit;
 *   - a token ending in `-` is never a class at all, since every utility
 *     carries a value and the bare ones carry no hyphen.
 *
 * Hyphenated and numeric tokens are kept, which is where every real dead class
 * in this codebase has turned out to live.
 */
const NOT_A_CLASS = /^(?:[a-z]+|[a-z-]+-)$/;

/**
 * Every utility starts with a lowercase letter or an arbitrary-value bracket.
 *
 * Written as a lookahead rather than `[^a-z\[]` because the escape is required
 * inside the character class and the lint rule does not believe that. The two
 * forms are equivalent, and `class-check.test.ts` pins the behaviour rather than
 * the spelling.
 */
const NOT_A_CLASS_NAME = /^(?!\[)[^a-z]/;

function candidates(): string[] {
  const tokens = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(?:tsx?|jsx?)$/.test(entry)) continue;
      // The tests for *this* script name dead classes on purpose, in strings.
      if (entry.includes(".test.") || entry.includes(".stories.")) continue;
      const source = readFileSync(full, "utf8");
      for (const literal of classLiterals(source)) {
        for (const token of literal.split(/\s+/)) {
          if (
            token &&
            !token.includes("*") &&
            !NOT_A_CLASS.test(token) &&
            !NOT_A_CLASS_NAME.test(token) &&
            !MARKER_CLASSES.test(token)
          ) {
            tokens.add(token);
          }
        }
      }
    }
  };

  walk(SRC);
  return [...tokens];
}

/**
 * Undo CSS selector escaping.
 *
 * Two kinds, and the second one is easy to miss. `\:`, `\[` and `\` are simple
 * escapes. But a CSS identifier cannot *start* with a digit, so `2xl:grid-cols-4`
 * is emitted as `.\32 xl\:grid-cols-4` — a hex escape followed by a space.
 * Unescaping that as a simple `\.` pair yields the string `32 xl:grid-cols-4`,
 * which matches nothing, and every `2xl:` and `3xl:` variant in the app reads as
 * a dead class.
 */
function unescapeSelector(name: string): string {
  return name
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\(.)/g, "$1");
}

/**
 * CSS this app ships that is not in `globals.css`.
 *
 * Compiling one stylesheet is not the same as compiling the app. A component can
 * import its own CSS, and a component can carry a `<style>` block — and both
 * reach the browser. `animate-confetti` lives in a `<style>` tag inside
 * `Confetti.tsx`, and `gpu-accelerated-tiles` in `leaflet.css`, which
 * `MapClient.tsx` imports. Reading only `globals.css` reported both as dead
 * classes, which is worse than useless: a false positive teaches you to
 * disbelieve the report.
 *
 * Erring wide is the right direction for a dead-class check. Including CSS that
 * does not reach a given page costs a missed bug; excluding CSS that does
 * produces a false alarm on every run.
 */
function otherStylesheets(): string[] {
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.endsWith(".css")) {
        if (full !== STYLESHEET) parts.push(readFileSync(full, "utf8"));
      } else if (entry.endsWith(".tsx")) {
        // `.tsx` only. A `.ts` file here is `lib/email/template-renderer.ts`,
        // which contains an HTML email template with its own `<style>` block —
        // picking that up fed postcss half a document and failed the whole run.
        const source = readFileSync(full, "utf8");
        for (const match of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
          // A styled-jsx tag holds a JS expression, not CSS: `<style>{` … `}</style>`.
          // Handing postcss the braces and backticks is a parse error, and a
          // parse error here is a report that prints nothing at all.
          const body = match[1]
            .trim()
            .replace(/^\{\s*/, "")
            .replace(/\s*\}$/, "")
            .replace(/^`/, "")
            .replace(/`$/, "");
          parts.push(body);
        }
      }
    }
  };
  walk(SRC);
  return parts;
}

/**
 * Class names in a chunk of CSS.
 *
 * Each source is parsed on its own. Concatenating them into one stylesheet looks
 * equivalent and is not: a source that ends mid-declaration hands the next one a
 * broken document, and every file in `src/` parses cleanly.
 */
function emittedClasses(sources: string[]): Set<string> {
  const found = new Set<string>();

  for (const css of sources) {
    postcss.parse(css).walkRules((rule: Rule) => {
      for (const part of rule.selectors) {
        // A selector like `.dark\:hover\:text-foreground:hover` holds two
        // different colons, and telling them apart is the whole job: Tailwind
        // *escapes* the colon that separates a variant and leaves the
        // pseudo-class colon unescaped. The class name is everything up to the
        // first unescaped colon; `\\.` carries the escaped ones, and any escaped
        // bracket in an arbitrary value, through to the end.
        //
        // The hex-escape alternative must come first and must carry the space
        // that terminates it. A CSS identifier cannot start with a digit, so
        // `2xl:grid-cols-4` is emitted as `.\32 xl\:grid-cols-4`; without that
        // alternative the token ends at the space and every `2xl:` and `3xl:`
        // variant in the app reads as a dead class.
        //
        // Reading the pseudo-class as part of the name made every variant+state
        // utility look dead — 400-odd false positives, all of them real CSS.
        for (const match of part.matchAll(/\.((?:\\[0-9a-fA-F]{1,6}\s?|\\.|[^\s.[\]:(])+)/g)) {
          found.add(unescapeSelector(match[1]));
        }
      }
    });
  }

  return found;
}

if (!existsSync(STYLESHEET)) {
  console.error(`  ${RED}No stylesheet at ${STYLESHEET}${RESET}`);
  process.exit(1);
}

const started = Date.now();
const compiled = (await postcss([tailwind()]).process(readFileSync(STYLESHEET, "utf8"), { from: STYLESHEET })).css;
const emitted = emittedClasses([compiled, ...otherStylesheets()]);
const used = candidates();

const liveNamespaces = new Set<string>();
for (const candidate of used) {
  if (emitted.has(candidate)) liveNamespaces.add(namespaceOf(candidate));
}

const dead = used
  .filter((candidate) => !emitted.has(candidate))
  .map((candidate) => [candidate, namespaceOf(candidate)] as const)
  // A token with no namespace at all is the tail of a dynamic one — the residue
  // of `text-${size}px` is `[10px]` — and its prefix is what would be checked.
  .filter(([, namespace]) => namespace.length > 0)
  .filter(([, namespace]) => liveNamespaces.has(namespace))
  .map(([candidate]) => candidate)
  .sort();

const groups = new Map<string, string[]>();
for (const candidate of dead) {
  const key = namespaceOf(candidate);
  groups.set(key, [...(groups.get(key) ?? []), candidate]);
}

if (process.argv.includes("--write-baseline")) {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ total: dead.length }, null, 2)}\n`);
  console.log(`\n${GREEN}✓${RESET} Baseline written: ${dead.length} dead candidates.\n`);
  process.exit(0);
}

console.log(`\n${BOLD}Dead class check${RESET} ${YELLOW}(compiled in ${Date.now() - started}ms)${RESET}`);

if (process.argv.includes("--report")) {
  for (const [key, members] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${BOLD}${key}-*${RESET}  (${members.length})`);
    for (const member of members.slice(0, 12)) console.log(`    ${member}`);
    if (members.length > 12) console.log(`    … and ${members.length - 12} more`);
  }
  console.log("");
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as { total: number })
  : null;

const problems: string[] = [];

if (baseline === null) {
  problems.push(
    "No baseline at scripts/check-classes-baseline.json. Create it with:\n" +
      "      bun run check:classes -- --write-baseline",
  );
} else if (dead.length > baseline.total) {
  problems.push(
    `Dead class candidates grew: ${dead.length} now against a baseline of ${baseline.total} (+${dead.length - baseline.total}). A class that emits no CSS renders unstyled, and nothing else in this repo can see that.`,
  );
}

if (problems.length > 0) {
  console.error(`\n${RED}${BOLD}Dead class check failed${RESET}\n`);
  for (const problem of problems) console.error(`  ${problem}\n`);
  console.error(`  Run 'bun run check:classes -- --report' to see them.\n`);
  process.exit(1);
}

console.log(
  `  ${GREEN}✓${RESET} ${used.length} classes referenced, ${emitted.size} emitted, ` +
    `${dead.length} dead (baseline ${baseline?.total}).`,
);
console.log(`  ${YELLOW}·${RESET} ${groups.size} namespace(s) affected. Run '-- --report'.\n`);
