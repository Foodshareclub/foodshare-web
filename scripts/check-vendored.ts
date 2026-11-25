#!/usr/bin/env bun
/**
 * F1 mirror gate: the web's vendored Supabase copies are the backend's.
 *
 * Background. The backend is the source of truth for `supabase/functions`,
 * `supabase/migrations` and `scripts/external-monitor.sh`; the web carries
 * vendored copies. The copies drifted twice silently:
 *
 *   1. A guard landed only on a detached backend worktree, was synced into
 *      the web from that unpushed commit, and the worktree was discarded —
 *      the web then carried a guard the backend's origin/main never had
 *      (dangling-42c2b998). The divergence was invisible for weeks because
 *      the only comparison ran at web-sync time, against the tree it had
 *      just been copied from.
 *   2. Backend advanced while the web stayed put, and the mirror went red
 *      only when a human ran a full `diff -r`.
 *
 * This script is the comparison half of the gate. It enforces ZERO
 * divergence, byte-exact, with NO formatting exceptions and NO allowlist:
 * a file with a "known delta" is exactly where a future dropped guard
 * hides. Divergence in either direction fails:
 *
 *   - `only-in-web`    — web carries what backend main lacks (direction 1)
 *   - `only-in-backend`/`modified` — backend advanced, web is stale (direction 2)
 *
 * The CI job (`vendored` in web.yml) is the GATE, not a report: it runs
 * this script against a fresh checkout of the backend's LIVE origin/main
 * (via CROSS_REPO_TOKEN) and blocks the production image on any
 * divergence. The local sibling-checkout form is the pre-push equivalent.
 *
 * Usage:
 *   bun scripts/check-vendored.ts --backend-dir <path-to-backend-checkout>
 *
 * Exit 0 = zero divergence; exit 1 = divergence (the divergent files are
 * printed); exit 2 = bad usage / unreadable trees.
 */

import { readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";

/** The three vendored trees, relative to their repo root. */
export const VENDORED_DIRS = ["supabase/functions", "supabase/migrations"] as const;
export const VENDORED_FILES = ["scripts/external-monitor.sh"] as const;

/** Directories never part of a vendored tree. */
const EXCLUDED_DIRS = new Set(["node_modules"]);

export type DivergenceKind = "only-in-web" | "only-in-backend" | "modified";

export interface Divergence {
  /** Path relative to the compared root (e.g. `supabase/functions/foo/index.ts`). */
  path: string;
  kind: DivergenceKind;
}

export interface VendoredReport {
  divergences: Divergence[];
  /** Number of files compared byte-for-byte (web side + backend side union). */
  filesCompared: number;
}

function listFiles(root: string, prefix: string): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string, rel: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // missing subdir: reported as divergence via the set difference
    }
    for (const entry of entries) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name), relPath);
      } else if (entry.isFile()) {
        if (entry.name === ".DS_Store" || entry.name.startsWith("._")) continue;
        out.add(relPath);
      }
    }
  };
  walk(join(root, prefix), prefix);
  return out;
}

function relativeFiles(root: string): Set<string> {
  const files = new Set<string>();
  for (const dir of VENDORED_DIRS) {
    for (const f of listFiles(root, dir)) files.add(f);
  }
  for (const file of VENDORED_FILES) {
    try {
      if (statSync(join(root, file)).isFile()) files.add(file);
    } catch {
      // missing on this side: reported via the set difference
    }
  }
  return files;
}

/**
 * Byte-exact comparison of the vendored trees. Both roots must contain the
 * three vendored paths; anything missing, extra, or differing is a
 * divergence. Pure read-only: never writes.
 */
export function compareVendored(webRoot: string, backendRoot: string): VendoredReport {
  const web = relativeFiles(webRoot);
  const backend = relativeFiles(backendRoot);
  const divergences: Divergence[] = [];

  for (const path of web) {
    if (!backend.has(path)) divergences.push({ path, kind: "only-in-web" });
  }
  for (const path of backend) {
    if (!web.has(path)) divergences.push({ path, kind: "only-in-backend" });
  }
  const common = [...web].filter((p) => backend.has(p)).sort();
  for (const path of common) {
    const a = readFileSync(join(webRoot, path));
    const b = readFileSync(join(backendRoot, path));
    if (!a.equals(b)) divergences.push({ path, kind: "modified" });
  }

  divergences.sort((x, y) => x.path.localeCompare(y.path));
  return { divergences, filesCompared: new Set([...web, ...backend]).size };
}

function main(): void {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--backend-dir");
  if (idx === -1 || !args[idx + 1]) {
    console.error("usage: bun scripts/check-vendored.ts --backend-dir <path-to-backend-checkout>");
    process.exit(2);
  }
  const backendDir = args[idx + 1];
  const webRoot = join(import.meta.dir, "..");

  const report = compareVendored(webRoot, backendDir);
  if (report.divergences.length > 0) {
    console.error(
      `F1 MIRROR GATE FAILED: ${report.divergences.length} divergence(s) across ${report.filesCompared} files (byte-exact, no exceptions):`,
    );
    for (const d of report.divergences) {
      console.error(`  [${d.kind}] ${d.path}`);
    }
    console.error("\nFix by syncing from the backend's origin/main: bun scripts/vendored-sync.ts --backend-dir <path>");
    process.exit(1);
  }
  console.log(`F1 mirror gate pass: zero divergence across ${report.filesCompared} files.`);
}

if (import.meta.main) {
  main();
}
