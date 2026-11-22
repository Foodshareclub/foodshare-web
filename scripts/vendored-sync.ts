#!/usr/bin/env bun
/**
 * Vendor-sync with provenance: the sync may only source from a backend
 * commit REACHABLE FROM origin/main.
 *
 * The refused class (t_71873bcd): a vendor-sync sourced from commit
 * 42c2b998, which existed only on a detached backend worktree and was never
 * pushed to origin/main. The worktree was discarded afterwards, the commit
 * orphaned, and the web was left carrying a copy no canonical ref carried.
 *
 * Provenance check (gate B), fail-closed:
 *
 *   git -C <backend> fetch origin main
 *   tip  = git -C <backend> rev-parse origin/main
 *   sha  = --sha <sha> ?? tip
 *   if --sha was given:
 *     git -C <backend> merge-base --is-ancestor <sha> origin/main || die
 *
 * An explicit `--sha` that is not an ancestor of the live origin/main is a
 * refusal — including a sha the local object store cannot resolve at all
 * (the discarded-worktree case). Default source is the live tip, so an
 * ordinary sync always lands the web on the backend's origin/main.
 *
 * After the copy, the sync proves itself: the vendored trees in this repo
 * must be byte-identical to the source tree (the same comparison the CI
 * gate runs). Note: sourcing from an ancestor that is NOT the tip will pass
 * the provenance check but fail the CI mirror gate until a follow-up sync
 * catches the web up to the tip — by design, the mirror allows no delta.
 *
 * Usage:
 *   bun scripts/vendored-sync.ts --backend-dir <path> [--sha <sha>]
 *
 * Exit 0 = synced + proven; exit 1 = provenance refusal or sync failure.
 */

import { cpSync, mkdirSync, mkdtempSync, rmSync } from "bun:fs";
import { join } from "bun:path";
import { tmpdir } from "bun:os";
import { compareVendored, VENDORED_DIRS, VENDORED_FILES } from "./check-vendored";

export interface SyncResult {
  /** The commit the trees were sourced from. */
  sha: string;
  /** The live origin/main tip at sync time. */
  tip: string;
  filesCompared: number;
}

function git(backendDir: string, args: string[]): { ok: boolean; out: string; err: string } {
  const proc = Bun.spawnSync(["git", "-C", backendDir, ...args]);
  const decode = (out: Uint8Array | null): string => (out == null ? "" : new TextDecoder().decode(out));
  return {
    ok: proc.success,
    out: decode(proc.stdout).trim(),
    err: decode(proc.stderr).trim(),
  };
}

/**
 * Gate B: verify the sync source is reachable from origin/main. Returns the
 * resolved {sha, tip}; throws on refusal (fail-closed: anything unverifiable
 * is a refusal).
 */
export function verifySyncSource(backendDir: string, requestedSha?: string): { sha: string; tip: string } {
  const fetch = git(backendDir, ["fetch", "--quiet", "--no-tags", "origin", "main"]);
  if (!fetch.ok) {
    throw new Error(`provenance: cannot fetch origin/main from ${backendDir}: ${fetch.err || fetch.out}`);
  }
  const tipRes = git(backendDir, ["rev-parse", "origin/main"]);
  if (!tipRes.ok) {
    throw new Error(`provenance: origin/main not resolvable after fetch: ${tipRes.err || tipRes.out}`);
  }
  const tip = tipRes.out;
  if (!requestedSha) {
    return { sha: tip, tip };
  }
  const sha = requestedSha.trim().toLowerCase();
  const ancestor = git(backendDir, ["merge-base", "--is-ancestor", sha, "origin/main"]);
  if (!ancestor.ok) {
    throw new Error(
      `provenance REFUSED: sync source ${sha} is not reachable from origin/main ` +
        `(tip ${tip}). An unpushed or other-branch commit must not be a sync source — ` +
        "push it to main first, then sync from the tip.",
    );
  }
  return { sha, tip };
}

/** Materialize the vendored paths of <sha> into a fresh temp dir (git archive | tar). */
function materialize(backendDir: string, sha: string): string {
  const paths = [...VENDORED_DIRS, ...VENDORED_FILES];
  const staging = mkdtempSync(join(tmpdir(), "vendored-sync-"));
  const archive = Bun.spawnSync(["git", "-C", backendDir, "archive", sha, ...paths]);
  if (!archive.success) {
    rmSync(staging, { recursive: true, force: true });
    const stderr = archive.stderr == null ? "" : new TextDecoder().decode(archive.stderr);
    throw new Error(`materialize: git archive ${sha} failed: ${stderr.trim()}`);
  }
  const tarFile = join(staging, ".vendored.tar");
  Bun.write(tarFile, archive.stdout);
  const tar = Bun.spawnSync(["tar", "-x", "-f", tarFile, "-C", staging]);
  if (!tar.success) {
    rmSync(staging, { recursive: true, force: true });
    const err = tar.stderr == null ? "" : new TextDecoder().decode(tar.stderr);
    throw new Error(`materialize: tar extract failed: ${err.trim()}`);
  }
  return staging;
}

/**
 * The full sync: provenance check (B), byte copy of the three vendored
 * trees, then the byte-identity proof (the CI gate's own comparison).
 */
export function syncFromSource(backendDir: string, webRoot: string, requestedSha?: string): SyncResult {
  const { sha, tip } = verifySyncSource(backendDir, requestedSha);
  const staging = materialize(backendDir, sha);
  try {
    for (const dir of VENDORED_DIRS) {
      rmSync(join(webRoot, dir), { recursive: true, force: true });
      mkdirSync(join(webRoot, dir), { recursive: true });
      cpSync(join(staging, dir), join(webRoot, dir), { recursive: true });
    }
    for (const file of VENDORED_FILES) {
      const target = join(webRoot, file);
      rmSync(target, { force: true });
      mkdirSync(join(webRoot, "scripts"), { recursive: true });
      cpSync(join(staging, file), target);
    }
    const report = compareVendored(webRoot, staging);
    if (report.divergences.length > 0) {
      throw new Error(
        `sync proof FAILED: ${report.divergences.length} divergence(s) between the synced ` +
          `trees and source ${sha}: ${report.divergences.map((d) => `${d.kind}:${d.path}`).join(", ")}`,
      );
    }
    return { sha, tip, filesCompared: report.filesCompared };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf("--backend-dir");
  const shaIdx = args.indexOf("--sha");
  if (dirIdx === -1 || !args[dirIdx + 1]) {
    console.error("usage: bun scripts/vendored-sync.ts --backend-dir <path> [--sha <sha>]");
    process.exit(2);
  }
  const backendDir = args[dirIdx + 1];
  const requestedSha = shaIdx !== -1 ? args[shaIdx + 1] : undefined;
  const webRoot = join(import.meta.dir, "..");

  try {
    const result = syncFromSource(backendDir, webRoot, requestedSha);
    console.log(
      `vendored-sync: sourced ${result.sha} (origin/main tip ${result.tip}); ` +
        `${result.filesCompared} files byte-identical.`,
    );
    if (result.sha !== result.tip) {
      console.log(
        "NOTE: sourced a commit behind the origin/main tip — the mirror gate " +
          "stays red until a sync from the tip lands.",
      );
    }
  } catch (err) {
    console.error(`vendored-sync REFUSED: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
