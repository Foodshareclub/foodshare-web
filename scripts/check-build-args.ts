#!/usr/bin/env bun
/**
 * The Dockerfile's `NEXT_PUBLIC_*` list must cover every variable `src/` reads.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time. A variable that
 * `src/` reads but the Dockerfile does not declare as an ARG therefore arrives
 * in the built image as `undefined` — with no build error, no warning, and no
 * runtime error either. The code simply takes its "not configured" branch, and
 * the feature is off in production while looking fine in development.
 *
 * That is not hypothetical. The list was missing 19 of the 29 the code reads,
 * including:
 *
 *   - NEXT_PUBLIC_GA_MEASUREMENT_ID        the gtag snippet was absent from the
 *                                           built HTML; GA4 collected nothing
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY         push subscribe always failed
 *   - NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION the verification meta tag was absent
 *   - NEXT_PUBLIC_TELEGRAM_BOT_USERNAME    Telegram login unreachable
 *
 * So the list is checked against the source rather than trusted. The Dockerfile
 * and this script are a matched pair: add a `NEXT_PUBLIC_` read to `src/`, and
 * this fails until the Dockerfile declares it.
 *
 * Variables that are deliberately *not* declared are listed in
 * `RUNTIME_ONLY`, with the reason. Those are read only on the server, or are
 * build-injected by Next itself, so a client bundle never needs them.
 */

import { readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";

const ROOT = join(import.meta.dir, "..");
const DOCKERFILE = join(ROOT, "Dockerfile");
const SRC_DIR = join(ROOT, "src");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/**
 * `NEXT_PUBLIC_*` variables that must NOT be an ARG, and why. A name here means
 * "somebody will try to add it"; the reason is the thing a reviewer needs.
 */
const RUNTIME_ONLY = new Set<string>();

/** Recursively list files under `dir` with the given extensions. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

if (!(await Bun.file(DOCKERFILE).exists())) {
  console.error(`${RED}No Dockerfile at ${DOCKERFILE}${RESET}`);
  process.exit(1);
}

// Tests are excluded: they run in CI, not in a browser, so a variable that only
// a test mentions never reaches a bundle and needs no build arg.
const files = walk(SRC_DIR).filter((f) => !/(^|[\\/])__tests__([\\/]|$)|\.(test|spec)\.[jt]sx?$/.test(f));

// Every NEXT_PUBLIC_* the source reads.
const read = new Set<string>();
const readAt = new Map<string, string>();

for (const file of files) {
  const source = await Bun.file(file).text();
  for (const match of source.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
    const name = match[1];
    read.add(name);
    if (!readAt.has(name)) readAt.set(name, file.replace(`${ROOT}/`, ""));
  }
}

// Every NEXT_PUBLIC_* the Dockerfile declares as a build arg.
const dockerfile = await Bun.file(DOCKERFILE).text();
const declared = new Set<string>();
for (const match of dockerfile.matchAll(/^ARG\s+(NEXT_PUBLIC_[A-Z0-9_]+)/gm)) {
  declared.add(match[1]);
}

// Declared but never read: harmless, but it means the list has drifted the other
// way and the ARG is dead weight in every build.
const declaredButUnused = [...declared].filter((name) => !read.has(name)).sort();

const required = [...read].filter((name) => !RUNTIME_ONLY.has(name)).sort();
const missing = required.filter((name) => !declared.has(name)).sort();

console.log(`\n${BOLD}${CYAN}Build-arg coverage${RESET}`);
console.log(`  ${read.size} NEXT_PUBLIC_* read in src · ${declared.size} declared as ARG\n`);

if (declaredButUnused.length > 0) {
  console.log(`  ${CYAN}Declared but not read${RESET}`);
  for (const name of declaredButUnused) {
    console.log(`    ${name}`);
  }
  console.log("");
}

if (missing.length > 0) {
  console.error(
    `${RED}${BOLD}  ${missing.length} NEXT_PUBLIC_* variable(s) reach the browser but are not build args${RESET}`,
  );
  console.error("  Each one is `undefined` in the built image, with no error at any stage:\n");
  for (const name of missing) {
    console.error(`    ${RED}${name}${RESET}  —  ${readAt.get(name)}`);
  }
  console.error(`\n  For each, add to Dockerfile in the builder stage:
    ARG ${missing[0]}
    ENV ${missing[0]}=\$${missing[0]}
  and pass it as a build-arg in .github/workflows/web.yml.
  If a variable genuinely should not be inlined, add it to RUNTIME_ONLY in
  scripts/check-build-args.ts with a reason.\n`);
  process.exit(1);
}

console.log(`  ${GREEN}Every NEXT_PUBLIC_* read in src is declared as a build arg.${RESET}\n`);
