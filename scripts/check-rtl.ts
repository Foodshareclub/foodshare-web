#!/usr/bin/env bun
/**
 * Guards the direction of the UI, which is otherwise the one property of this
 * codebase that no compiler, test, or build can check.
 *
 * The app ships Arabic, so every `dir="rtl"` document renders this UI
 * right-to-left. Tailwind's *logical* utilities — `ms-`/`me-`, `ps-`/`pe-`,
 * `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`,
 * `rounded-s`/`rounded-e` — follow the document direction with no extra
 * markup. The *physical* ones — `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`,
 * `text-left`, `text-right`, `border-l`, `border-r` — do not. There were 729
 * of them across 192 files, with `rtl:` variants in only two: the dialog close
 * button sat in the top-left for every Arabic reader, the vertical scrollbar
 * wore its border on the wrong side, and the search field's magnifier stayed on
 * the left of the input.
 *
 * A mechanical sweep of all 729 is not something to do blind — a wrong swap is
 * a silent visual regression, and no amount of green output can see it. So the
 * gate is scoped to what it can hold honestly, and the rest is pinned:
 *
 *   1. The shared primitives in `src/components/ui/` and `src/components/
 *      ui-library/` are held to **zero**, unconditionally. These are the
 *      building blocks for every modal, drawer, menu, select, card and
 *      breadcrumb, so a physical side here is wrong in every surface at once.
 *   2. Everything else is held to **"must not grow"**, against a committed
 *      baseline in `scripts/check-rtl-baseline.json`. Today that is 405 uses
 *      across 173 files. It fails when the total or the file count rises, which
 *      is what stops the next contributor from adding to the pile.
 *
 * The distinction is not a compromise to be tidied away later. It is the
 * difference between a rule that can be enforced today and one that gets
 * disabled in a week. `--report` prints the outstanding occurrences as the
 * working list; the sweep proceeds file by file, reviewed, at 10 at a time.
 *
 * Three idioms are recognised rather than reported, because a physical side is
 * the correct answer there: the centring pair, an inset that agrees with a
 * same-side Radix slide, and a corner-*named* placement such as
 * `"bottom-right": "right-0"`. Each is exercised by `rtl-check.test.ts`, along
 * with the three cases this guard was wrong about the first time it ran.
 *
 * Usage:
 *   bun run check:rtl                    # the gate
 *   bun run check:rtl -- --report        # the working list
 *   bun run check:rtl -- --write-baseline  # only after deliberately sweeping
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "bun:fs";
import { join, resolve } from "bun:path";

/**
 * Defaults to this script's own repository. `RTL_CHECK_ROOT` exists so the
 * tests can point the guard at a fixture tree — deriving the root from
 * `import.meta.dir` is right in production and useless in a test, and a test
 * that quietly checks the real tree instead of its fixture is worse than no
 * test, because it reports green for a guard it never exercised.
 */
const ROOT = process.env.RTL_CHECK_ROOT ? resolve(process.env.RTL_CHECK_ROOT) : join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/**
 * Physical utilities. Matched as whole class tokens so `flex-1` cannot be read
 * as `flex` + something, and so `-right-1` (a negative offset) is caught while
 * `brightness-50` is not.
 */
/**
 * The sign is part of the pattern, not excluded by the lookbehind.
 *
 * `(?<![\w-])` before the utility name means a preceding `-` blocks the match —
 * so `-ml-2`, `-left-1` and every negative inset were invisible to the guard.
 * Twenty-nine of them exist. The guard reported the debt as swept while the
 * count never moved, which is the failure this project has already produced
 * twice: a number that looks like progress and is not.
 *
 * The value alternation admits an arbitrary value (`left-[50%]`) as well, for
 * the same reason. `left-[50%]` is as physical as `left-4`, and the guard was
 * blind to every one of them.
 */
const SIGN = "(?<![\\w-])(-?)";
/** A spacing or inset value, arbitrary-value form included, consumed so the report names it. */
const V_MARGIN = "(?:[\\d.]+|\\[[^\\]]*\\]|px|auto|full)";
const V_PADDING = "(?:[\\d.]+|\\[[^\\]]*\\]|px)";
const V_INSET = "(?:[\\d.]+|\\[[^\\]]*\\]|px|auto|full|1\\/2)";

const PHYSICAL = [
  // margins — `-ml-[100%]` is why the arbitrary-value form is here
  new RegExp(`${SIGN}ml-${V_MARGIN}(?![\\w-])`, "g"),
  new RegExp(`${SIGN}mr-${V_MARGIN}(?![\\w-])`, "g"),
  // padding
  new RegExp(`${SIGN}pl-${V_PADDING}(?![\\w-])`, "g"),
  new RegExp(`${SIGN}pr-${V_PADDING}(?![\\w-])`, "g"),
  // insets, negative and arbitrary-value forms included
  new RegExp(`${SIGN}left-${V_INSET}(?![\\w-])`, "g"),
  new RegExp(`${SIGN}right-${V_INSET}(?![\\w-])`, "g"),
  // text alignment
  /(?<![\w:-])text-left(?![\w-])/g,
  /(?<![\w:-])text-right(?![\w-])/g,
  // borders
  /(?<![\w-])border-l(?:-[\w./]+)?(?![\w-])/g,
  /(?<![\w-])border-r(?:-[\w./]+)?(?![\w-])/g,
  // radii
  /(?<![\w-])rounded-l(?:-[\w./]+)?(?![\w-])/g,
  /(?<![\w-])rounded-r(?:-[\w./]+)?(?![\w-])/g,
  // transforms
  /(?<![\w-])-translate-x-(?:full|1\/2|[\d.]+)(?![\w-])/g,
];

/**
 * Three shapes where a physical side is the correct answer, so the guard has to
 * recognise them rather than report them. Each is symmetric or explicitly keyed
 * to a physical edge, and swapping either half would break it.
 *
 * 1. Centring: `left-1/2 -translate-x-1/2` centres an absolutely positioned
 *    element. Swapping the inset alone moves the element off centre.
 * 2. A side-keyed class map: `{ right: "right-0 … slide-in-from-right" }`. The
 *    key names the physical edge the component is anchored to, and the inset has
 *    to agree with it — including in an RTL document, where "open from the
 *    right" still means the right.
 * 3. A corner-placement map: `{ "bottom-right": "bottom-0 right-0" }`. A toast
 *    anchored to the bottom-*right* corner is bottom-right in every locale; that
 *    is what the name means.
 */
/** A transform or spacing value, arbitrary-value form included. */
const V = "(?:[\\d.]+|\\[[^\\]]*\\])";

const PHYSICAL_IS_OK: RegExp[] = [
  // 1. centring, in both the fractional and the arbitrary-value spelling.
  //    `left-[50%] translate-x-[-50%]` is the same idiom as
  //    `left-1/2 -translate-x-1/2`, and it is in `ui/dialog.tsx`. Excluding only
  //    the fractional spelling made the shared-primitive rule fail on a
  //    centring pair that has been correct all along.
  /left-1\/2[\s\S]{0,80}?-translate-x-1\/2|-translate-x-1\/2[\s\S]{0,80}?left-1\/2/,
  /left-\[\d+%?\][\s\S]{0,80}?translate-x-\[-\d+%?\]|translate-x-\[-\d+%?\][\s\S]{0,80}?left-\[\d+%?\]/,
  /left-\[\d+%?\][\s\S]{0,80}?-translate-x-\[\d+%?\]|-translate-x-\[\d+%?\][\s\S]{0,80}?left-\[\d+%?\]/,
  // 2. an inset agreeing with a same-side slide animation
  /(?:left-0|left-[\d.]+|right-0|right-[\d.]+)[\s\S]{0,120}?slide-(?:in-from|out-to)-(?:left|right)|slide-(?:in-from|out-to)-(?:left|right)[\s\S]{0,120}?(?:left-0|right-0)/,
  // 2b. an inset agreeing with a side *name* it is compared against —
  //     `triggerPosition === "left" ? "left-[-10px]" : "right-4"`. The value is
  //     chosen by which physical side the caller asked for, so it must stay on
  //     that side. This is ResponsiveContainer's scroll-to-top button.
  //
  //     The ternary form is a separate pattern, and it has to be tried *first*.
  //     The two-argument version matches `"left" … "left-[-10px]"` and consumes
  //     the condition along with the first arm, after which the ternary has
  //     nothing left to match and the `else` arm is reported. A ternary whose
  //     condition is a side name and whose arms are both physical insets is the
  //     whole construct, so it has to be recognised as one.
  /"(?:left|right)"\s*(?:===|==)?\s*[^?:]{0,40}\?\s*"[^"]{0,40}(?:left|right)-[\d.[\]][^"]{0,20}"\s*:\s*"[^"]{0,40}(?:left|right)-[\d.[\]][^"]{0,20}"/,
  /"(?:left|right)"[\s\S]{0,120}?(?:-?)(?:left|right)-(?:[\d.]+|\[[^\]]*\])|(?:-?)(?:left|right)-(?:[\d.]+|\[[^\]]*\])[\s\S]{0,120}?"(?:left|right)"/,
  // 3. a corner-named placement key
  /"(?:top|bottom)-(?:left|right)"\s*:\s*"[^"]*\b(?:left|right)-/,
  // 4. a directional transform with an explicit `rtl:` override beside it.
  //    `group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5` is a
  //    chevron that tugs left in LTR and right in RTL. The base is physical on
  //    purpose; the override is what makes it correct in both, and the
  //    accordion chevrons in the settings pages are written exactly this way —
  //    one of them with the signs the other way round, which is why there are
  //    two patterns rather than one with an alternation.
  //
  //    Two details made the first version inert. The sign sits *before* the
  //    name, so each side has to assert it: `(?<![\w-])` rejects a leading
  //    minus and gives the positive form, and the `rtl:` side spells its own
  //    sign out. And a greedy `[^\s"']*` over the variant prefix swallows that
  //    sign, so it has to be lazy.
  //
  //    `V` is interpolated, not written literally: `(V)` in a `new RegExp`
  //    string is a group matching the letter V, which quietly excluded one file
  //    and nothing else.
  new RegExp(`(?<![\\w-])-translate-x-(${V})[\\s\\S]{0,200}?rtl:(?:[^\\s"']*?)(?<!-)\\btranslate-x-\\1`, "g"),
  new RegExp(`(?<![\\w-])translate-x-(${V})[\\s\\S]{0,200}?rtl:(?:[^\\s"']*?)-translate-x-\\1`, "g"),
  // 6. a transform on a line that also mentions rtl — a *runtime* direction
  //    branch, as opposed to the `rtl:` variant in idiom 4.
  //
  //      const offscreen = getLocaleDirection(useLocale()) === "rtl"
  //        ? "translate-x-8" : "-translate-x-8";
  //
  //    Both arms are physical and that is the point: one of them is correct in
  //    each direction, which is exactly what a single class name cannot express.
  //    There is no logical form of `translate-x`, so this has to be a
  //    conditional. Line-scoped, because "the line mentions rtl" is the whole
  //    signal and a wider window started forgiving transforms in the next
  //    statement along.
  /(?<![\w-])-?translate-x-(?:[\d.]+|-?\[[^\]]*\])[^\n]*rtl[^\n]*/g,
  /[^\n]*rtl[^\n]*(?:-|\b)translate-x-(?:[\d.]+|-?\[[^\]]*\])[^\n]*/g,
  // 5. a transform nudged on *both* axes: `-translate-x-0.5 translate-y-0.5` on
  //    a `Send` glyph inside a fixed box. That is optical centring of a
  //    mark that does not sit square in its box, and it cannot be about reading
  //    direction — a glyph does not move when the document mirrors.
  /(?:-|\s)translate-x-(?:[\d.]+|\[[^\]]*\])[\s\S]{0,80}?(?:\s)translate-y-(?:[\d.]+|\[[^\]]*\])|(?:\s)translate-y-(?:[\d.]+|\[[^\]]*\])[\s\S]{0,80}?(?:-|\s)translate-x-(?:[\d.]+|\[[^\]]*\])/,
];

/** Remove every recognised idiom, longest-first so 1 wins over 2. */
function stripPhysicalIdioms(source: string): string {
  let out = source;
  for (const pattern of PHYSICAL_IS_OK) {
    let match = pattern.exec(out);
    while (match) {
      out = out.slice(0, match.index) + " ".repeat(match[0].length) + out.slice(match.index + match[0].length);
      match = pattern.exec(out);
    }
  }
  return out;
}

/**
 * Files exempt from the blanket ban, each with the reason. Every entry is a
 * deliberate decision, so a reader can challenge it.
 */
const ALLOWLIST: Record<string, string> = {
  // The challenge-reveal card deck. A card stack is positioned by a touch
  // gesture: `dragX` comes from `offset.x`, and a card is thrown left or right
  // by the finger. The deck's geometry — the stack's offsets, the swipe
  // indicator's `-translate-x-16`, the corner overlays — is physical in every
  // locale because it tracks a fingertip, not a line of text. Mirroring it
  // would put the stack's origin on the wrong side of the gesture.
  "src/components/modals/challenge-reveal/CardFace.tsx":
    "touch-driven card stack; geometry follows the finger, not the reading direction",
  "src/components/modals/challenge-reveal/SwipeIndicators.tsx":
    "touch-driven card stack; the indicator slides with the drag offset",
  "src/components/modals/challenge-reveal/DeckStack.tsx":
    "touch-driven card stack; each card is offset by its index in the stack",
  // Twelve percentage and pixel offsets positioning blurred radial-gradient
  // blobs behind a donation form. They are `pointer-events-none -z-10`
  // decoration with no layout role, several of them a deliberate off-centre
  // composition (`left-[50%]` with no translate, and a four-sided
  // `-top-[30px] -left-[30px] -right-[30px] -bottom-[30px]` ring). Mirroring
  // them changes the composition in Arabic for no reader benefit, and sweeping
  // them blind is the exact failure this guard exists to prevent.
  // A circle half-hanging off a card's top-right corner, nudged out with
  // `translate-x-1/2`. There is no logical form of `translate-x` to pair with an
  // `end-0`, so mirroring the anchor would move the nudge to the wrong side of
  // the element and change the LTR composition. A card's corner wash has no
  // reading order to respect.
  "src/components/forum/ForumPageClient.tsx":
    "decorative corner wash; a translate nudge has no logical form to pair with",
  // A rendered sky: a sun and a field of white dots on the theme preview. A
  // sky has no inside, and mirroring a star field changes nothing a reader
  // perceives — while a rule that tried to tell a 1px decoration from a 24px
  // selection indicator would be guessing. The selection indicator in the same
  // component is a real affordance and has been fixed.
  "src/components/theme/ThemeSettingsPanel.tsx": "theme preview artwork: a sun and a star field, with no layout role",
  "src/app/donation/page.tsx": "decorative gradient field; offsets compose the artwork and carry no layout meaning",
  // The project logo and the category strip are laid out for a brand mark that
  // has a fixed orientation, and the mobile drawer slides from the physical end
  // with a JS-driven transform.
  "src/components/header/navbar/atoms/NavbarLogo.tsx": "brand mark has a fixed orientation",
  // The map and its controls are a spatial interface: north is up in every
  // locale, and the Leaflet control stack is positioned by the library in
  // physical pixels.
  "src/components/leaflet/MapContainer.tsx": "map controls are positioned by Leaflet in physical pixels",
  "src/components/leaflet/MapClient.tsx": "map controls are positioned by Leaflet in physical pixels",
  "src/components/leaflet/ViewportLoader.tsx": "map overlays are positioned by Leaflet",
  "src/components/leaflet/MapPositionTracker.tsx": "map overlays are positioned by Leaflet",
  "src/components/leaflet/MapControls.tsx": "zoom controls mirror the map, not the text",
};

/** The shared primitives: no allowlist, no exceptions. */
const PRIMITIVES_DIRS = [join(SRC, "components", "ui"), join(SRC, "components", "ui-library")];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function isPrimitive(file: string): boolean {
  // The trailing separator matters: without it, `ui` also matches `ui-library`.
  // It did, and the guard reported three files in a directory it was not
  // documenting while missing the distinction that made them primitives.
  return PRIMITIVES_DIRS.some((dir) => file.startsWith(`${dir}/`));
}

/**
 * Remove the tokens that legitimately mention a physical side.
 *
 * Radix positions and animates against *physical* sides: its `side="left"` prop
 * is the left of the viewport in an RTL document, and the matching Tailwind
 * animation is `data-[side=left]:slide-in-from-right-2`. Swapping either half
 * would desynchronise the animation from the side Radix actually chose, and
 * the first version of this script flagged them as violations.
 */
function stripPhysicalByName(source: string): string {
  return (
    source
      // `data-[side=left]:…` and the whole animated declaration it selects.
      .replace(/data-\[side=[a-z]+\]:[a-z0-9-]+/gi, " ")
      // The animation names themselves.
      .replace(/\b(?:slide-in-from|slide-out-to|animate-in|animate-out)-[a-z0-9-]+/g, " ")
  );
}

/**
 * Blank out comments, preserving offsets.
 *
 * A guard that reads documentation is a guard that cries wolf. The first
 * version flagged `ml-auto` in `kbd.tsx` — where it appears in a usage example
 * inside a doc comment, not in any rendered className.
 */
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

function physicalUses(raw: string): string[] {
  const found = new Set<string>();
  // Order matters: the idiom check needs the `slide-in-from-<side>` names still
  // present, because "an inset that agrees with a same-side slide animation" is
  // the thing it is looking for. Stripping the animation names first deleted the
  // evidence and left the idiom looking like a bare violation.
  const scannable = stripPhysicalByName(stripPhysicalIdioms(stripComments(raw)));
  for (const pattern of PHYSICAL) {
    for (const match of scannable.matchAll(pattern)) found.add(match[0]);
  }
  return [...found].sort();
}

const files = walk(SRC);

interface Violation {
  file: string;
  uses: string[];
}
/**
 * Committed ratchet: the totals for the pre-existing debt this guard does not
 * attempt to sweep today.
 *
 * The rule is "must not grow", not "must be zero". A blind mechanical swap of
 * ~700 occurrences is a visual change that neither the build nor a test can
 * verify, and a wrong one is a silent regression in Arabic. So the debt is
 * pinned here, the gate fails on any increase, and `--report` prints the
 * working list.
 *
 * The shared primitives are the exception to the ratchet and are held to zero
 * unconditionally, because a physical side there is wrong in every surface at
 * once.
 *
 * Regenerate deliberately, never automatically, and only after sweeping:
 *   bun run check:rtl -- --write-baseline
 */
const BASELINE_PATH = join(ROOT, "scripts", "check-rtl-baseline.json");

interface Baseline {
  total: number;
  files: number;
}

const byFile = new Map<string, string[]>();
/** Hard failures in the shared primitives. The ratchet does not apply here. */
const primitiveViolations: Violation[] = [];
/** Everything else, measured against the baseline. */
const otherByFile = new Map<string, string[]>();

for (const file of files) {
  const relative = file.replace(`${ROOT}/`, "");
  const uses = physicalUses(readFileSync(file, "utf8"));
  if (uses.length === 0) continue;

  byFile.set(relative, uses);

  if (isPrimitive(file)) primitiveViolations.push({ file: relative, uses });
  else if (!(relative in ALLOWLIST)) otherByFile.set(relative, uses);
}

// Counted over the un-allowlisted set, not over `byFile`. Including the
// allowlist in the total but not in the file count produced "25 uses across 0
// files", which is not a number anyone can act on — and it means an allowlisted
// file can never be subtracted from the baseline, so the ratchet can only grow.
const totalPhysical = [...otherByFile.values()].reduce((sum, uses) => sum + uses.length, 0);

const baseline: Baseline | null = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline)
  : null;

if (process.argv.includes("--write-baseline")) {
  mkdirSync(join(ROOT, "scripts"), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ total: totalPhysical, files: otherByFile.size }, null, 2)}\n`);
  console.log(`\n${GREEN}✓${RESET} Baseline written: ${totalPhysical} uses across ${otherByFile.size} files.\n`);
  process.exit(primitiveViolations.length === 0 ? 0 : 1);
}

console.log(`\n${BOLD}${CYAN}RTL direction check${RESET}`);

if (process.argv.includes("--report")) {
  const outstanding = [...otherByFile.entries()].sort();
  console.log(`\n  ${outstanding.length} file(s) still carry physical direction utilities.`);
  console.log(`  ${BOLD}File${RESET}${"".padEnd(62)}Uses`);
  for (const [file, uses] of outstanding) {
    const shown = uses.slice(0, 6).join(" ");
    const more = uses.length > 6 ? ` +${uses.length - 6}` : "";
    console.log(`  ${file.padEnd(62)}${shown}${more}`);
  }
  console.log("\n  Logical equivalents follow the document direction automatically:");
  console.log("    ml→ms   mr→me   pl→ps   pr→pe   left→start   right→end");
  console.log("    text-left→text-start   text-right→text-end");
  console.log("    border-l→border-s   border-r→border-e");
  console.log("    rounded-l→rounded-s   rounded-r→rounded-e\n");
  console.log("  For a directional icon, mirror it rather than swapping it:");
  console.log('    <ChevronRight className="rtl:scale-x-100" />\n');
  console.log("  If a use is genuinely physical, add the file to ALLOWLIST in");
  console.log("  scripts/check-rtl.ts with the reason.\n");
  process.exit(0);
}

const problems: string[] = [];

if (primitiveViolations.length > 0) {
  problems.push(
    [
      `${primitiveViolations.length} shared primitive(s) in src/components/ui/ use a physical direction utility.`,
      "    These are the building blocks for every modal, drawer, menu, select and",
      "    breadcrumb, so a physical side here is wrong in every surface at once:",
      primitiveViolations.map((v) => `      ${v.file}: ${v.uses.join(" ")}`).join("\n"),
    ].join("\n"),
  );
}

if (baseline === null) {
  problems.push(
    "No baseline at scripts/check-rtl-baseline.json. Create it with:\n      bun run check:rtl -- --write-baseline",
  );
} else {
  if (totalPhysical > baseline.total) {
    problems.push(
      `Physical direction utilities grew: ${totalPhysical} now against a baseline of ${baseline.total} (+${
        totalPhysical - baseline.total
      }). A new physical utility is not a matter of taste — it is a rendering bug for every reader of an RTL locale.`,
    );
  }
  if (otherByFile.size > baseline.files) {
    problems.push(
      `Files carrying physical utilities grew: ${otherByFile.size} now against a baseline of ${baseline.files}.`,
    );
  }
}

if (problems.length > 0) {
  console.error(`\n${RED}${BOLD}RTL direction check failed${RESET}\n`);
  for (const problem of problems) console.error(`  ${problem}\n`);
  console.error(`  Run 'bun run check:rtl -- --report' for the outstanding occurrences.\n`);
  process.exit(1);
}

console.log(`  ${GREEN}✓${RESET} No physical direction utilities in the shared primitives.`);
console.log(
  `  ${GREEN}✓${RESET} Pre-existing debt is at or below the baseline: ${totalPhysical} uses across ` +
    `${otherByFile.size} files (baseline ${baseline?.total}/${baseline?.files}).`,
);
console.log(`  ${YELLOW}·${RESET} Run 'bun run check:rtl -- --report' for the outstanding occurrences.\n`);
