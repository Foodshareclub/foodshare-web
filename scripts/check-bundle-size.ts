#!/usr/bin/env bun
/**
 * First-load bundle budget.
 *
 * The previous version of this script summed every chunk in
 * `.next/static/chunks` and compared it to a 7 MB budget. Two problems, both of
 * which made it incapable of catching the regressions it existed for:
 *
 *   1. It measured the *whole build*, not any route. A change that added
 *      200 KB to the client bundle of every page passed, because 200 KB against
 *      5.8 MB of total was noise.
 *   2. It measured raw bytes only. Raw and what a user downloads differ by
 *      roughly 3.4x here, so the number in the report was not a number anyone
 *      experiences.
 *
 * The floor is the number that matters: the static legal pages (`/privacy`,
 * `/terms`, `/help`) render a page of text and a navbar, and they were
 * shipping 1.49 MB raw / ~453 KB gzip of JavaScript. That floor is the size of
 * the root layout's dependency graph — anything the layout imports is paid for
 * by all 70 routes — so it is the budget worth holding down.
 *
 * What is measured, per route, from `.next/diagnostics/route-bundle-stats.json`
 * (emitted by the Turbopack build):
 *
 *   - raw first-load JS, and the gzip size of exactly those chunks
 *   - the shared floor: the gzip cost common to every route, which is the layout
 *   - global CSS, which is render-blocking in <head> on every page
 *
 * Budgets are a ratchet, not a target: each is a ceiling that a change has to
 * argue with. Lower them as the numbers come down.
 *
 * Usage: bun run build && bun scripts/check-bundle-size.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const ROOT = process.env.BUNDLE_CHECK_ROOT ?? join(import.meta.dir, "..");
const STATS_PATH = join(ROOT, ".next", "diagnostics", "route-bundle-stats.json");
const CHUNKS_DIR = join(ROOT, ".next", "static", "chunks");

const KB = 1024;

interface RouteStats {
  route: string;
  firstLoadUncompressedJsBytes: number;
  firstLoadChunkPaths: string[];
}

interface Budget {
  label: string;
  limitKB: number;
  actualKB: number;
  /** Routes over the budget, for the failure message. */
  offenders?: string[];
}

function fail(message: string): never {
  console.error(`${RED}${BOLD}${message}${RESET}`);
  process.exit(1);
}

// Gated so the pure helpers above can be imported by tests without this
// module deciding to read the build output and exit the process on import.
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/**
 * The CSS files linked in <head> of every prerendered page — the intersection,
 * not the union. Route-specific stylesheets are linked by a handful of pages
 * and are not render-blocking everywhere, so counting them overstates the
 * first-load cost on the pages that never load them.
 *
 * Pure, so it can be tested without a build: takes page HTML, returns the
 * chunk filenames every page links.
 */
export function globalCssFiles(pages: string[]): string[] {
  if (pages.length === 0) return [];

  const cssPerPage = pages.map(
    (html) => new Set([...html.matchAll(/href="([^"]*\.css)"/g)].map((m) => m[1].split("/").pop()!)),
  );

  return [...cssPerPage[0]].filter((file) => cssPerPage.every((set) => set.has(file)));
}

// Global CSS: the stylesheets linked in <head> of *every* prerendered page.
// Summing every chunk in the directory counts route-specific CSS that most
// pages never load, which is not render-blocking and not what this budget is
// for. The intersection across pages is.
//
// Tailwind emits the union of every utility used anywhere in the app from a

if (import.meta.main) {
  if (!existsSync(STATS_PATH)) {
    fail(`No route bundle stats at ${STATS_PATH}. Run 'bun run build' first.`);
  }

  const routes: RouteStats[] = JSON.parse(readFileSync(STATS_PATH, "utf8"));

  if (!Array.isArray(routes) || routes.length === 0) {
    fail(`Route bundle stats at ${STATS_PATH} is empty or not an array.`);
  }

  /**
   * gzip a file the way a server would serve it.
   *
   * Level 9 rather than the default 6: a budget that depends on the compressor's
   * mood is a budget that fails for the wrong reason. It is slightly slower and
   * this script touches a few hundred files.
   */
  const gzipSizeCache = new Map<string, number>();

  function gzipSizeOf(relativePath: string): number {
    const cached = gzipSizeCache.get(relativePath);
    if (cached !== undefined) return cached;

    const absolute = join(ROOT, relativePath);
    if (!existsSync(absolute)) return 0;

    const size = Bun.gzipSync(readFileSync(absolute), { level: 9 }).length;
    gzipSizeCache.set(relativePath, size);
    return size;
  }

  /**
   * The floor: bytes every route pays.
   *
   * Computed as the intersection of every route's first-load chunks, which is the
   * layout plus the framework runtime. Reported because it is the number that a
   * careless root-layout import moves, and it moves it for every page at once.
   */
  function sharedFloorChunks(routeList: RouteStats[]): Set<string> {
    if (routeList.length === 0) return new Set();

    const shared = new Set(routeList[0].firstLoadChunkPaths);
    for (const route of routeList.slice(1)) {
      const theirs = new Set(route.firstLoadChunkPaths);
      for (const chunk of shared) {
        if (!theirs.has(chunk)) shared.delete(chunk);
      }
    }
    return shared;
  }

  function sumGzip(paths: Iterable<string>): number {
    let total = 0;
    for (const path of paths) total += gzipSizeOf(path);
    return total;
  }

  const floorChunks = sharedFloorChunks(routes);
  const floorGzipKB = Math.round(sumGzip(floorChunks) / KB);

  // Per-route gzip, worst first.
  const routeGzip = routes
    .map((route) => ({
      route: route.route,
      gzipKB: Math.round(sumGzip(route.firstLoadChunkPaths) / KB),
    }))
    .sort((a, b) => b.gzipKB - a.gzipKB);

  const worstGzip = routeGzip[0];
  const worstRaw = routes.reduce((a, b) => (a.firstLoadUncompressedJsBytes > b.firstLoadUncompressedJsBytes ? a : b));

  // single root import, which is why the global sheet is large.
  const APP_DIR = join(ROOT, ".next", "server", "app");
  let globalCssKB = 0;
  let globalCssGzipKB = 0;
  if (existsSync(APP_DIR) && existsSync(CHUNKS_DIR)) {
    // _global-error.html is the error boundary: it links no stylesheets, so it
    // would empty the intersection. It is not a page.
    const pages = walk(APP_DIR)
      .filter((f) => f.endsWith(".html") && !f.endsWith("_global-error.html"))
      .map((f) => readFileSync(f, "utf8"));

    const globalFiles = globalCssFiles(pages);
    globalCssKB = globalFiles.reduce((sum, file) => sum + statSync(join(CHUNKS_DIR, file)).size / KB, 0);
    globalCssGzipKB = Math.round(
      globalFiles.reduce((sum, file) => sum + gzipSizeOf(join(".next", "static", "chunks", file)), 0) / KB,
    );
  }

  /**
   * Budgets: committed constants, deliberately not derived from the build they
   * check.
   *
   * The first version of this file computed each ceiling from the current
   * measurement. Mutation-testing it exposed why that is worthless: raising a
   * route's size in the stats raised the budget that route was then measured
   * against, and it passed. A budget that follows the thing it limits is not a
   * budget.
   *
   * So these are numbers in the source, to be lowered by hand when the bundle
   * genuinely improves — which is the only way the change is visible in review.
   *
   * Re-derive after a build: `bun scripts/check-bundle-size.ts` prints every
   * actual, and each budget here is that actual plus ~2%, rounded up to 5 KB (raw
   * JS to 10 KB) so measurement noise cannot fail a build.
   *
   * Where they came from, and what they lock in: 475 / 1530 / 385 / 460 were
   * measured after removing four things from the root layout's dependency graph —
   * the `@/lib/utils` barrel (which reached the browser Supabase client through
   * lib/security/mfa), framer-motion (via the toast provider), the `@/hooks`
   * barrel, and `useAuth` in the navbar. That took the shared floor from 453 KB
   * gzip to 377 KB. Two of the largest chunks in the floor are the React and
   * Next.js runtimes, 135 KB gzip together, and are not reducible from here; the
   * headroom worth fighting for is in the remaining ~240 KB.
   *
   * The CSS ceiling is the one that has to move for new *design*, rather than
   * for a new dependency. 460 → 495, and the reason is worth reading before
   * moving it again:
   *
   *   - The growth is the homepage: a hero, a category grid, a three-step
   *     explainer and a CTA, built from gradients, layered shadows and
   *     backdrop filters. Measured by utility family, the sheet's two largest
   *     groups are `from-*`/`to-*`/`via-*` gradient stops at 105 KB (23%) and
   *     `shadow-*` at 25 KB, and those two groups are essentially all of the
   *     increase. This is the design, not waste in it.
   *   - The sheet is global because Tailwind v4 emits one stylesheet containing
   *     every utility used anywhere in the app, so homepage-only classes land
   *     here too. Splitting them out is not available: the CSS chunk is a
   *     single shared asset, and nothing about a utility's usage makes it
   *     route-scoped.
   *   - Scoping the typography plugin out of the global sheet was tried and
   *     does not work. Moving `@plugin "@tailwindcss/typography"` (35 KB of
   *     the sheet) into a stylesheet imported only by the content pages leaves
   *     it in the global sheet, because the directive is only honoured in the
   *     Tailwind entry: in a route-level CSS file it silently emits nothing,
   *     and every `prose-*` variant then renders unstyled. `check:classes`
   *     caught it — which is the guard earning its keep on the one change that
   *     would have shipped a silent visual regression on 6 routes.
   *
   * So the honest lever is the ceiling, raised once and stated here. The next
   * person to want CSS back should reach for the shadow scale, not this number:
   * 65 unique `shadow-[…]` arbitrary values predate the homepage and are the
   * larger and more tractable target.
   */
  const WORST_ROUTE_GZIP_BUDGET_KB = 475;
  const WORST_ROUTE_RAW_BUDGET_KB = 1530;
  const SHARED_FLOOR_GZIP_BUDGET_KB = 385;
  const GLOBAL_CSS_RAW_BUDGET_KB = 495;

  const BUDGETS: Budget[] = [
    {
      label: "Worst route, gzip JS",
      limitKB: WORST_ROUTE_GZIP_BUDGET_KB,
      actualKB: worstGzip.gzipKB,
      offenders: routeGzip.filter((r) => r.gzipKB > WORST_ROUTE_GZIP_BUDGET_KB).map((r) => `${r.route} ${r.gzipKB}KB`),
    },
    {
      label: "Worst route, raw JS",
      limitKB: WORST_ROUTE_RAW_BUDGET_KB,
      actualKB: Math.round(worstRaw.firstLoadUncompressedJsBytes / KB),
      offenders: routes
        .filter((r) => r.firstLoadUncompressedJsBytes / KB > WORST_ROUTE_RAW_BUDGET_KB)
        .map((r) => `${r.route} ${Math.round(r.firstLoadUncompressedJsBytes / KB)}KB`),
    },
    {
      label: "Shared floor, gzip JS",
      limitKB: SHARED_FLOOR_GZIP_BUDGET_KB,
      actualKB: floorGzipKB,
    },
    {
      label: "Global CSS, raw",
      limitKB: GLOBAL_CSS_RAW_BUDGET_KB,
      actualKB: Math.round(globalCssKB),
    },
  ];

  console.log(`\n${BOLD}${CYAN}First-load bundle budget${RESET}`);
  console.log(`${routes.length} routes · floor is ${floorChunks.size} shared chunks\n`);

  console.log(`  ${BOLD}Metric${RESET}${"".padEnd(28)}${"Budget".padEnd(10)}Actual`);
  console.log(`  ${"─".repeat(70)}`);

  let hasFailures = false;

  for (const budget of BUDGETS) {
    const over = budget.actualKB > budget.limitKB;
    // The budgets are derived from the current build, so "near" has to mean
    // genuinely near. At 95% every row warned and the signal was worth nothing.
    const near = !over && budget.actualKB > budget.limitKB * 0.99;
    const mark = over ? `${RED}FAIL${RESET}` : near ? `${YELLOW}WARN${RESET}` : `${GREEN}PASS${RESET}`;

    console.log(`  ${budget.label.padEnd(28)}${`${budget.limitKB} KB`.padEnd(10)}${mark} ${budget.actualKB} KB`);

    if (over) {
      hasFailures = true;
      if (budget.offenders?.length) {
        // Cap the list: if everything is over, the first few are enough to act on.
        for (const offender of budget.offenders.slice(0, 8)) {
          console.log(`        ${RED}${offender}${RESET}`);
        }
        if (budget.offenders.length > 8) {
          console.log(`        ${RED}…and ${budget.offenders.length - 8} more routes${RESET}`);
        }
      }
    }
  }

  console.log(`\n  ${BOLD}Worst five routes by gzip JS${RESET}`);
  for (const entry of routeGzip.slice(0, 5)) {
    console.log(`    ${entry.route.padEnd(30)}${entry.gzipKB} KB`);
  }

  console.log(
    `\n  ${BOLD}Global CSS${RESET} ${Math.round(globalCssKB)} KB raw / ${globalCssGzipKB} KB gzip (render-blocking on every page)\n`,
  );

  if (hasFailures) {
    fail(
      "First-load budget exceeded. The usual causes, in the order they happen:\n" +
        "  1. A barrel re-export: `@/lib/utils` and `@/hooks` are imported almost\n" +
        "     everywhere, so anything reachable from them is in every route.\n" +
        "  2. A heavy import in the root layout or a shared provider — that moves\n" +
        "     the floor, and the floor is what 70 routes pay.\n" +
        "  3. A component using 'use client' that could be a Server Component.\n" +
        "\nRun 'bun run build:analyze' to see which module pulled the weight in.",
    );
  }

  console.log(`${GREEN}${BOLD}First-load budgets pass.${RESET}\n`);
}
