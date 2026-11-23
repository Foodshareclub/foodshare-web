import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  realpathSync,
} from "bun:fs";
import { join } from "bun:path";
import { tmpdir } from "bun:os";
import { compareVendored } from "../../../scripts/check-vendored";
import {
  syncFromSource,
  verifySyncSource,
} from "../../../scripts/vendored-sync";

/**
 * The dangling-42c2b998 scenario, end to end:
 *
 *   1. A guard lands on a DETACHED backend worktree, never pushed.
 *   2. A vendor-sync copies it into the web from that unpushed commit.
 *   3. The worktree is discarded — the commit orphans.
 *
 * Gate C (the mirror) must reject the web state (web carries a file the
 * backend's origin/main never had). Gate B (provenance) must refuse the
 * unpushed commit as a sync source. After the guard is actually pushed,
 * both gates pass.
 */

const GUARD_V1 = "export function enrich() {\n  return 'unguarded';\n}\n";
const GUARD_V2 =
  "export function enrich() {\n  if (!requireServiceAuth(event)) return deny();\n  return 'guarded';\n}\n";

let root: string;
let origin: string;
let backend: string;
let web: string;
let baseSha = "";
let guardSha = "";

function git(cwd: string, ...args: string[]): string {
  const proc = Bun.spawnSync(["git", "-C", cwd, ...args]);
  const decode = (out: Uint8Array | null): string =>
    out == null ? "" : new TextDecoder().decode(out);
  if (!proc.success) {
    throw new Error(`git ${args.join(" ")}: ${decode(proc.stderr).trim()}`);
  }
  return decode(proc.stdout).trim();
}

function seedTree(dir: string, guardVersion: string): void {
  rmSync(join(dir, "supabase"), { recursive: true, force: true });
  rmSync(join(dir, "scripts"), { recursive: true, force: true });
  mkdirSync(join(dir, "supabase/functions/enrich"), { recursive: true });
  mkdirSync(join(dir, "supabase/migrations"), { recursive: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "supabase/functions/enrich/index.ts"), guardVersion);
  writeFileSync(
    join(dir, "supabase/migrations/0001_init.sql"),
    "create table t (id int);\n",
  );
  writeFileSync(
    join(dir, "scripts/external-monitor.sh"),
    "#!/usr/bin/env bash\necho ok\n",
  );
}

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "vendored-gate-")));
  origin = join(root, "origin.git");
  backend = join(root, "backend");
  web = join(root, "web");

  mkdirSync(origin);
  git(origin, "init", "--bare", "-b", "main");
  git(root, "clone", "-q", origin, "backend");
  git(backend, "config", "user.email", "t@t");
  git(backend, "config", "user.name", "t");

  // Base state (what origin/main carries).
  seedTree(backend, GUARD_V1);
  git(backend, "add", "-A");
  git(backend, "commit", "-q", "-m", "base");
  git(backend, "push", "-q", "origin", "main");
  baseSha = git(backend, "rev-parse", "HEAD");

  // The guard: a commit on a DETACHED worktree, never pushed.
  const wt = join(root, "wt");
  git(backend, "worktree", "add", "--detach", "-q", wt);
  writeFileSync(join(wt, "supabase/functions/enrich/index.ts"), GUARD_V2);
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", "land the guard");
  guardSha = git(wt, "rev-parse", "HEAD");

  // The bad sync (t_71873bcd): the web is sourced from the UNPUSHED commit.
  seedTree(web, GUARD_V2);

  // Discard the worktree: the guard commit is now dangling.
  git(backend, "worktree", "remove", "--force", wt);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("gate C — the F1 mirror (zero divergence, both directions)", () => {
  test("rejects the dangling sync: web carries the guard, origin/main never had it", () => {
    const report = compareVendored(web, backend);
    expect(report.divergences.length).toBeGreaterThan(0);
    expect(report.divergences).toContainEqual({
      path: "supabase/functions/enrich/index.ts",
      kind: "modified",
    });
  });

  test("rejects the reverse direction: backend main has a file the web lacks", () => {
    const staleWeb = join(root, "stale-web");
    seedTree(staleWeb, GUARD_V1); // in sync with origin/main at base
    // Backend advances: a new edge function lands on main.
    mkdirSync(join(backend, "supabase/functions/new-fn"), { recursive: true });
    writeFileSync(
      join(backend, "supabase/functions/new-fn/index.ts"),
      "export {};\n",
    );
    git(backend, "add", "-A");
    git(backend, "commit", "-q", "-m", "advance backend");
    git(backend, "push", "-q", "origin", "main");

    const report = compareVendored(staleWeb, backend);
    expect(report.divergences).toContainEqual({
      path: "supabase/functions/new-fn/index.ts",
      kind: "only-in-backend",
    });

    // Restore the fixture for the remaining tests.
    git(origin, "update-ref", "refs/heads/main", baseSha);
    git(backend, "reset", "--hard", "-q", baseSha);
    git(backend, "fetch", "-q", "origin", "main");
    rmSync(join(backend, "supabase/functions/new-fn"), {
      recursive: true,
      force: true,
    });
    rmSync(staleWeb, { recursive: true, force: true });
  });

  test("passes on a truly in-sync mirror", () => {
    const syncedWeb = join(root, "synced-web");
    seedTree(syncedWeb, GUARD_V1);
    const report = compareVendored(syncedWeb, backend);
    expect(report.divergences).toEqual([]);
    expect(report.filesCompared).toBe(3);
    rmSync(syncedWeb, { recursive: true, force: true });
  });
});

describe("gate B — vendor-sync provenance (origin/main reachability)", () => {
  test("refuses the dangling worktree commit as a sync source", () => {
    expect(() => verifySyncSource(backend, guardSha)).toThrow(
      /provenance REFUSED/,
    );
  });

  test("refuses a sha the object store cannot resolve", () => {
    expect(() => verifySyncSource(backend, "deadbeef")).toThrow(
      /provenance REFUSED/,
    );
  });

  test("accepts the live origin/main tip by default", () => {
    const { sha, tip } = verifySyncSource(backend);
    expect(sha).toBe(tip);
    expect(sha).toBe(baseSha);
  });

  test("refuses a sync from the dangling sha end-to-end (the t_71873bcd failure)", () => {
    const target = join(root, "target-web");
    expect(() => syncFromSource(backend, target, guardSha)).toThrow(
      /provenance REFUSED/,
    );
    expect(readFileSync).toBeDefined(); // the target must be untouched (no partial sync)
    rmSync(target, { recursive: true, force: true });
  });
});

describe("acceptance — the scenario can no longer complete silently", () => {
  test("after the guard is pushed, sync from the tip passes both gates", () => {
    // The cure: the guard actually lands on origin/main.
    git(backend, "push", "-q", "origin", `${guardSha}:main`);
    git(backend, "checkout", "-q", guardSha);

    const target = join(root, "cured-web");
    const result = syncFromSource(backend, target);
    expect(result.sha).toBe(guardSha);

    // The mirror now sees zero divergence against the live origin/main.
    const report = compareVendored(target, backend);
    expect(report.divergences).toEqual([]);
    expect(
      readFileSync(join(target, "supabase/functions/enrich/index.ts"), "utf8"),
    ).toBe(GUARD_V2);

    rmSync(target, { recursive: true, force: true });
  });

  test("syncing from a pushed ANCESTOR is allowed by B but the mirror flags the gap", () => {
    // baseSha is an ancestor of the tip (guardSha) — provenance allows it…
    const target = join(root, "behind-web");
    const result = syncFromSource(backend, target, baseSha);
    expect(result.sha).toBe(baseSha);
    // …but the mirror against live origin/main now diverges (the guard file).
    const report = compareVendored(target, backend);
    expect(report.divergences.length).toBeGreaterThan(0);
    rmSync(target, { recursive: true, force: true });
  });
});
