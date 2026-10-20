/**
 * The `tsconfig.json` arrays must stay formatted one entry per line.
 *
 * Turbopack parses `tsconfig.json` itself, and when the `include` and
 * `exclude` arrays are collapsed onto a single line it silently drops the
 * whole `paths` map. Every `@/...` import then fails to resolve, and the
 * build reports several hundred "Module not found" errors with nothing
 * pointing at the cause.
 *
 * This script fails loudly instead, so a reformat of that file cannot reach
 * the build.
 *
 * Usage: bun scripts/check-tsconfig-shape.ts
 */
import { join } from "bun:path";

const TSCONFIG = join(import.meta.dir, "..", "tsconfig.json");

const source = await Bun.file(TSCONFIG).text();

// Find the `include` and `exclude` arrays and check that each entry is on its
// own line. A single-line array is the shape that breaks the Turbopack parser.
const problems: string[] = [];

for (const key of ["include", "exclude"]) {
  const match = source.match(new RegExp(`"${key}"\\s*:\\s*\\[[^\\]]*\\]`, "s"));
  if (!match?.[0]) {
    problems.push(`"${key}" is missing or could not be read`);
    continue;
  }
  const entries = match[0]
    .replace(/^\s*"/, "")
    .replace(/"\s*$/, "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length > 1 && !match[0].includes("\n")) {
    problems.push(
      `"${key}" is on a single line with ${entries.length} entries — Turbopack drops the whole "paths" map when the arrays are collapsed, and every "@/..." import fails to resolve`,
    );
  }
}

if (problems.length > 0) {
  console.error("❌ tsconfig.json is shaped in a way that breaks the build:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("\nKeep the `include` and `exclude` arrays one entry per line.");
  process.exit(1);
}

console.log("✅ tsconfig.json arrays are formatted one entry per line");
