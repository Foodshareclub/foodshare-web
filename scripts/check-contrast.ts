import { join } from "bun:path";

/**
 * WCAG contrast guard for the design tokens in `src/styles/variables.css`.
 *
 * Every pair below is a foreground token and a background token that appear
 * together in a real component, so the ratio between them is a contrast ratio a
 * user actually experiences. The two that were failing:
 *
 *   --primary-foreground on --primary   3.61:1   AA needs 4.5:1
 *   --primary on --background           3.61:1   same, for every `text-primary`
 *
 * `--primary` is the background of the default Button at `text-sm` — 14px/500,
 * which is normal text, not the 18.66px/14px-bold that earns the 3:1
 * large-text threshold. So every Sign in, Publish, Save, Submit and Send button
 * in the app was below AA, and so was every primary-coloured link.
 *
 * Contrast is the one accessibility property that is cheap to get right once and
 * impossible to review by eye across 21 themes, so it is asserted here rather
 * than left to whoever changes a token next.
 *
 * `--border` is deliberately NOT in this list. It measures 1.27:1 against the
 * background, and WCAG 1.4.11 wants 3:1 for the boundary of a control — but
 * 1.4.11 is about boundaries *necessary to identify* a control, and raising
 * `--border` to 3:1 would redraw every divider and card outline in the app.
 * That is a design decision with a much wider blast radius than a foreground
 * pair, and it is recorded in the token's own comment rather than changed
 * unilaterally here.
 *
 * Usage: bun run check:contrast
 */

const CSS_PATH = join(import.meta.dir, "..", "src", "styles", "variables.css");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/** WCAG 2.1 AA for normal text. */
const AA_TEXT = 4.5;
/** AA for large text (>=18.66px bold or >=24px) and for UI component boundaries. */
const AA_LARGE = 3;

// ── colour maths ────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

/** `hsl(345 100% 46%)` and the Tailwind custom-property form both parse to RGB. */
function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as Rgb;
}

/** Relative luminance, per WCAG 2.1. */
function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── token extraction ────────────────────────────────────────────────────────

/**
 * Read `--token: <h> <s>% <l>%;` declarations, keeping the light and dark blocks
 * apart. The file is one `:root` for the light palette and an override block for
 * dark, so "dark" here means "the second and later occurrences".
 */
function readTokens(css: string): Map<string, { light: Rgb; dark: Rgb }> {
  const tokens = new Map<string, { light: Rgb; dark: Rgb }>();
  const seen = new Map<string, number>();

  for (const match of css.matchAll(/(--[a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/gi)) {
    const [, name, h, s, l] = match;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);

    const rgb = hslToRgb(Number(h), Number(s), Number(l));
    const entry = tokens.get(name);
    if (!entry) tokens.set(name, { light: rgb, dark: rgb });
    else entry.dark = rgb;
  }

  return tokens;
}

interface Pair {
  theme: "light" | "dark";
  foreground: string;
  background: string;
  minimum: number;
  where: string;
}

/**
 * Pairs that appear together in a component today. `where` is the component, so
 * a failure names the thing a user sees rather than two token names.
 */
const PAIRS: Pair[] = [
  {
    theme: "light",
    foreground: "--primary-foreground",
    background: "--primary",
    minimum: AA_TEXT,
    where: "Button (default and brand variants)",
  },
  {
    theme: "light",
    foreground: "--primary",
    background: "--background",
    minimum: AA_TEXT,
    where: "every text-primary link",
  },
  {
    theme: "light",
    foreground: "--destructive-foreground",
    background: "--destructive",
    minimum: AA_TEXT,
    where: "Button (destructive variant)",
  },
  {
    theme: "light",
    foreground: "--destructive",
    background: "--background",
    minimum: AA_TEXT,
    where: "every text-destructive label",
  },
  {
    theme: "light",
    foreground: "--foreground",
    background: "--background",
    minimum: AA_TEXT,
    where: "body text",
  },
  {
    theme: "light",
    foreground: "--muted-foreground",
    background: "--background",
    minimum: AA_TEXT,
    where: "secondary text on the page",
  },
  {
    theme: "light",
    foreground: "--muted-foreground",
    background: "--muted",
    minimum: AA_TEXT,
    where: "secondary text in a muted surface",
  },
  {
    theme: "light",
    foreground: "--secondary-foreground",
    background: "--secondary",
    minimum: AA_TEXT,
    where: "Button (secondary variant)",
  },
  {
    theme: "light",
    foreground: "--card-foreground",
    background: "--card",
    minimum: AA_TEXT,
    where: "card text",
  },
  {
    theme: "light",
    foreground: "--popover-foreground",
    background: "--popover",
    minimum: AA_TEXT,
    where: "popover and dropdown text",
  },
  {
    theme: "light",
    foreground: "--accent-foreground",
    background: "--accent",
    minimum: AA_TEXT,
    where: "Button (accent variant)",
  },
  {
    theme: "dark",
    foreground: "--primary-foreground",
    background: "--primary",
    minimum: AA_TEXT,
    where: "Button (default and brand variants)",
  },
  {
    theme: "dark",
    foreground: "--primary",
    background: "--background",
    minimum: AA_TEXT,
    where: "every text-primary link",
  },
  {
    theme: "dark",
    foreground: "--destructive-foreground",
    background: "--destructive",
    minimum: AA_TEXT,
    where: "Button (destructive variant)",
  },
  {
    theme: "dark",
    foreground: "--destructive",
    background: "--background",
    minimum: AA_TEXT,
    where: "every text-destructive label",
  },
  {
    theme: "dark",
    foreground: "--foreground",
    background: "--background",
    minimum: AA_TEXT,
    where: "body text",
  },
  {
    theme: "dark",
    foreground: "--muted-foreground",
    background: "--background",
    minimum: AA_TEXT,
    where: "secondary text on the page",
  },
  {
    theme: "dark",
    foreground: "--muted-foreground",
    background: "--muted",
    minimum: AA_TEXT,
    where: "secondary text in a muted surface",
  },
  {
    theme: "dark",
    foreground: "--secondary-foreground",
    background: "--secondary",
    minimum: AA_TEXT,
    where: "Button (secondary variant)",
  },
  {
    theme: "dark",
    foreground: "--card-foreground",
    background: "--card",
    minimum: AA_TEXT,
    where: "card text",
  },
  {
    theme: "dark",
    foreground: "--popover-foreground",
    background: "--popover",
    minimum: AA_TEXT,
    where: "popover and dropdown text",
  },
  {
    theme: "dark",
    foreground: "--accent-foreground",
    background: "--accent",
    minimum: AA_TEXT,
    where: "Button (accent variant)",
  },
];

// A ring is a focus indicator: a non-text UI boundary, so the 3:1 threshold.
const NON_TEXT: Pair[] = [
  {
    theme: "light",
    foreground: "--ring",
    background: "--background",
    minimum: AA_LARGE,
    where: "focus ring on the page background",
  },
  {
    theme: "dark",
    foreground: "--ring",
    background: "--background",
    minimum: AA_LARGE,
    where: "focus ring on the page background",
  },
];

const tokens = readTokens(await Bun.file(CSS_PATH).text());

const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

function evaluate(pair: Pair): { ratio: number; foreground: Rgb; background: Rgb } | { error: string } {
  const fg = tokens.get(pair.foreground);
  const bg = tokens.get(pair.background);
  if (!fg) return { error: `${pair.foreground} is not defined in variables.css` };
  if (!bg) return { error: `${pair.background} is not defined in variables.css` };

  const foreground = pair.theme === "light" ? fg.light : fg.dark;
  const background = pair.theme === "light" ? bg.light : bg.dark;
  return { ratio: contrastRatio(foreground, background), foreground, background };
}

console.log(`\n${BOLD}${CYAN}WCAG contrast${RESET}  ${CSS_PATH.replace(`${join(import.meta.dir, "..")}/`, "")}\n`);

const problems: Array<{ pair: Pair; detail: string }> = [];

for (const pair of [...PAIRS, ...NON_TEXT]) {
  const result = evaluate(pair);

  if ("error" in result) {
    problems.push({ pair, detail: result.error });
    continue;
  }

  const pass = result.ratio >= pair.minimum;
  if (!pass) {
    problems.push({
      pair,
      detail: `${toHex(result.foreground)} on ${toHex(result.background)} = ${result.ratio.toFixed(2)}:1, needs ${pair.minimum}:1`,
    });
  }

  console.log(
    `  ${pass ? `${GREEN}pass${RESET}` : `${RED}FAIL${RESET}`}  ${pair.theme.padEnd(5)} ` +
      `${`${pair.foreground} / ${pair.background}`.padEnd(46)} ` +
      `${result.ratio.toFixed(2).padStart(5)}:1 (min ${pair.minimum})  ${pair.where}`,
  );
}

console.log("");

if (problems.length > 0) {
  console.error(`${RED}${BOLD}✗ ${problems.length} contrast failure(s)${RESET}\n`);
  for (const { pair, detail } of problems) {
    console.error(
      `  ${RED}${pair.theme}${RESET} ${pair.foreground} on ${pair.background}\n    ${detail}\n    used by: ${pair.where}`,
    );
  }
  console.error(
    "\n  Adjust the token in src/styles/variables.css, or the threshold if the pair is\n" +
      "  genuinely not text-on-colour. Ratios are computed from the HSL values in the\n" +
      "  file — no sampling, no guesswork.\n",
  );
  process.exit(1);
}

console.log(`${GREEN}${BOLD}✓ every text pair meets WCAG AA.${RESET}\n`);
