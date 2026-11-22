/**
 * Acceptance fixtures for the F1 mirror recurrence control (t_5f703a4d).
 *
 * The incident: a guard landed only on a detached backend worktree, was
 * synced into the web from that unpushed commit, and the worktree was
 * discarded — the web then carried a guard the backend's origin/main
 * never had (dangling-42c2b998), and the drift was invisible because
 * the only comparison ran at sync time, against the tree just copied.
 *
 * These fixtures reproduce the failure shape in a local bare origin and
 * assert the three enforcement legs reject it:
 *
 *   (B) verifySyncSource — a sync source must be reachable from the
 *       backend's origin/main; an unpushed/local commit is refused.
 *   (C) compareVendored  — zero divergence, byte-exact, no exceptions,
 *       in either direction; the CLI contract is exactly what the CI
 *       `vendored` job runs.
 *   end-to-end           — the dangling scenario cannot complete: the
 *       sync is refused while the commit is unpushed, the web tree is
 *       left untouched, and the only path forward is pushing the
 *       artifact to origin/main and syncing from the tip.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareVendored } from "../../scripts/check-vendored";
import { syncFromSource, verifySyncSource } from "../../scripts/vendored-sync";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// The three vendored paths, in miniature.
const MIGRATION = "supabase/migrations/0001_init.sql";
const FUNCTION = "supabase/functions/api-v1-ai/index.ts";
const MONITOR = "scripts/external-monitor.sh";
const GUARD = "supabase/functions/api-v1-ai/lib/service-auth.ts";

const MIGRATION_V1 = "-- init\ncreate table listings (id bigint primary key);\n";
const FUNCTION_UNGUARDED = "export default { async POST(req) { return new Response('ok'); } };\n";
const FUNCTION_GUARDED =
  "import { requireServiceAuth } from './lib/service-auth';\n" +
  "export default { async POST(req) { requireServiceAuth(req); return new Response('ok'); } };\n";
const MONITOR_V1 = "#!/usr/bin/env bash\n# external monitor\n";
const GUARD_SRC =
  "export function requireServiceAuth(req: Request): void {\n  // service-role JWT only — user JWTs must not reach this route\n  throw new Error('service auth required');\n}\n";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeRepoFile(root: string, rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

/** Snapshot of every file under the three vendored paths. */
function treeSnapshot(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string, rel: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full, relPath);
      } else if (entry.isFile()) {
        out.set(relPath, readFileSync(full, "utf8"));
      }
    }
  };
  for (const dir of ["supabase/functions", "supabase/migrations", "scripts"]) {
    walk(join(root, dir), dir === "scripts" ? "scripts" : dir);
  }
  return out;
}

class DanglingFixture {
  root = "";
  origin = "";
  backend = "";
  web = "";

  setup(): void {
    this.root = mkdtempSync(join(tmpdir(), "vendored-gate-"));
    this.origin = join(this.root, "origin.git");
    this.backend = join(this.root, "backend");
    this.web = join(this.root, "web");
    mkdirSync(this.origin);
    git(this.origin, "init", "--bare", "-q", "-b", "main");
    git(this.root, "clone", "-q", this.origin, "backend");
    git(this.backend, "config", "user.email", "t@t");
    git(this.backend, "config", "user.name", "t");
    mkdirSync(this.web, { recursive: true });
  }

  cleanup(): void {
    rmSync(this.root, { recursive: true, force: true });
  }

  /** Commit `rel` with `content` in `dir`; returns the new sha. */
  commit(dir: string, rel: string, content: string): string {
    writeRepoFile(dir, rel, content);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", `fixture: ${rel}`);
    return git(dir, "rev-parse", "HEAD");
  }

  pushBackend(): void {
    git(this.backend, "push", "-q", "origin", "main");
  }

  /** Seed `web` with a correctly-synced copy of the three vendored paths. */
  seedWebFromPushed(): void {
    for (const [rel, content] of this.pushedTree()) {
      writeRepoFile(this.web, rel, content);
    }
  }

  /** Tree of the backend at its origin/main tip (what a sync may use). */
  pushedTree(): Map<string, string> {
    const tip = git(this.origin, "rev-parse", "refs/heads/main");
    const stage = join(this.root, "stage");
    rmSync(stage, { recursive: true, force: true });
    mkdirSync(stage, { recursive: true });
    // `git archive` pipes to tar; a shell pipe keeps this portable.
    execFileSync(`git --git-dir=${this.origin} archive ${tip} supabase scripts | tar -x -C ${stage}`, {
      shell: "/bin/bash",
    });
    return treeSnapshot(stage);
  }
}

describe("compareVendored — the hard F1-mirror gate (leg C)", () => {
  const fx = new DanglingFixture();
  beforeAll(() => fx.setup());
  afterAll(() => fx.cleanup());

  test("zero divergence → empty report", () => {
    const base = fx.commit(fx.backend, MIGRATION, MIGRATION_V1);
    fx.commit(fx.backend, FUNCTION, FUNCTION_UNGUARDED);
    fx.commit(fx.backend, MONITOR, MONITOR_V1);
    fx.pushBackend();
    fx.seedWebFromPushed();
    expect(base).toHaveLength(40);
    const report = compareVendored(fx.web, fx.backend);
    expect(report.divergences).toEqual([]);
    expect(report.filesCompared).toBeGreaterThan(0);
  });

  test("catches the dangling class: a guard only in web (only-in-web)", () => {
    // The web carries service-auth.ts; the backend's origin/main does not.
    // This is the exact direction of dangling-42c2b998.
    writeRepoFile(fx.web, GUARD, GUARD_SRC);
    const report = compareVendored(fx.web, fx.backend);
    expect(report.divergences).toEqual([{ path: GUARD, kind: "only-in-web" }]);
  });

  test("catches a stale mirror: backend advanced (only-in-backend + modified)", () => {
    // Remove the web-only guard, then advance the backend past the mirror.
    rmSync(join(fx.web, GUARD), { force: true });
    fx.commit(fx.backend, FUNCTION, FUNCTION_GUARDED);
    fx.commit(
      fx.backend,
      "supabase/migrations/0002_add_guard.sql",
      "-- guard\nalter table listings add column guard integer;\n",
    );
    const report = compareVendored(fx.web, fx.backend);
    const kinds = Object.fromEntries(report.divergences.map((d) => [d.path, d.kind]));
    expect(kinds[FUNCTION]).toBe("modified");
    expect(kinds["supabase/migrations/0002_add_guard.sql"]).toBe("only-in-backend");
  });
});

describe("verifySyncSource — vendor-sync provenance (leg B)", () => {
  const fx = new DanglingFixture();
  beforeAll(() => fx.setup());
  afterAll(() => fx.cleanup());

  let baseSha = "";
  let unpushedSha = "";

  beforeAll(() => {
    fx.commit(fx.backend, MIGRATION, MIGRATION_V1);
    baseSha = git(fx.backend, "rev-parse", "HEAD");
    fx.pushBackend();
    // The guard lands only on a local commit (the worktree shape): present
    // in the object store, absent from origin.
    writeRepoFile(fx.backend, GUARD, GUARD_SRC);
    fx.commit(fx.backend, FUNCTION, FUNCTION_GUARDED);
    unpushedSha = git(fx.backend, "rev-parse", "HEAD");
  });

  test("refuses a commit that is not reachable from origin/main", () => {
    // verifySyncSource is synchronous: it throws, it does not reject.
    expect(() => verifySyncSource(fx.backend, unpushedSha)).toThrow(
      /provenance REFUSED: sync source .* is not reachable from origin\/main/,
    );
  });

  test("accepts the origin/main tip and commits reachable from it", () => {
    const fromTip = verifySyncSource(fx.backend);
    expect(fromTip.sha).toBe(baseSha);
    expect(fromTip.tip).toBe(baseSha);
    const fromBase = verifySyncSource(fx.backend, baseSha);
    expect(fromBase.sha).toBe(baseSha);
  });
});

describe("syncFromSource end-to-end — the dangling-42c2b998 scenario cannot complete", () => {
  const fx = new DanglingFixture();
  beforeAll(() => fx.setup());
  afterAll(() => fx.cleanup());

  let guardSha = "";

  test("an unpushed guard is refused at sync and the web tree is untouched", async () => {
    // Base state: backend main pushed, web a correct mirror of it.
    fx.commit(fx.backend, MIGRATION, MIGRATION_V1);
    fx.commit(fx.backend, FUNCTION, FUNCTION_UNGUARDED);
    fx.commit(fx.backend, MONITOR, MONITOR_V1);
    fx.pushBackend();
    fx.seedWebFromPushed();
    const before = treeSnapshot(fx.web);

    // The guard lands only on a local (unpushed) commit.
    writeRepoFile(fx.backend, GUARD, GUARD_SRC);
    fx.commit(fx.backend, FUNCTION, FUNCTION_GUARDED);
    guardSha = git(fx.backend, "rev-parse", "HEAD");

    // The sync must refuse fail-closed, before any copy happens.
    expect(() => syncFromSource(fx.backend, fx.web, guardSha)).toThrow(/provenance REFUSED/);

    // Web tree byte-identical to before the attempt: no partial copy, and
    // the guard never arrived.
    expect(treeSnapshot(fx.web)).toEqual(before);
    expect(existsSync(join(fx.web, GUARD))).toBe(false);
  });

  test("after the artifact is pushed, syncing from the tip converges byte-exact", async () => {
    // The worktree is discarded: the local ref moves off the guard, leaving
    // the commit dangling in the object store.
    git(fx.backend, "reset", "--hard", "HEAD~1");

    // The operator recovers the artifact the only legal way: it is pushed
    // to the named ref.
    git(fx.backend, "push", "-q", "origin", `${guardSha}:main`);

    const result = syncFromSource(fx.backend, fx.web);
    expect(result.sha).toBe(guardSha);
    expect(result.tip).toBe(guardSha);

    // The web now carries exactly the backend's origin/main tree.
    const expected = fx.pushedTree();
    expect(treeSnapshot(fx.web)).toEqual(expected);
    expect(readFileSync(join(fx.web, GUARD), "utf8")).toBe(GUARD_SRC);
    expect(statSync(join(fx.web, GUARD)).isFile()).toBe(true);
  });
});

describe("CLI contract — the command the CI vendored job runs", () => {
  const fx = new DanglingFixture();
  beforeAll(() => fx.setup());
  afterAll(() => fx.cleanup());

  test("exits 1 and names the divergence when the trees differ", () => {
    // A backend fixture that differs from the repo's real vendored tree.
    const fakeBackend = join(fx.root, "fake-backend");
    mkdirSync(fakeBackend, { recursive: true });
    writeRepoFile(fakeBackend, MIGRATION, "-- deliberately different\n");
    writeRepoFile(fakeBackend, FUNCTION, "export default {};\n");
    writeRepoFile(fakeBackend, MONITOR, "#!/usr/bin/env bash\necho different\n");
    let status = 0;
    let stderr = "";
    try {
      execFileSync("bun", ["scripts/check-vendored.ts", "--backend-dir", fakeBackend], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      status = (e as { status?: number }).status ?? 99;
      stderr = (e as { stderr?: string }).stderr ?? "";
    }
    expect(status).toBe(1);
    expect(stderr).toContain("F1 MIRROR GATE FAILED");
  });

  test("exits 0 against a byte-identical backend tree", () => {
    const identical = join(fx.root, "identical-backend");
    mkdirSync(identical, { recursive: true });
    for (const rel of ["supabase/functions", "supabase/migrations"]) {
      cpSync(join(REPO_ROOT, rel), join(identical, rel), { recursive: true });
    }
    mkdirSync(join(identical, "scripts"), { recursive: true });
    cpSync(join(REPO_ROOT, "scripts", "external-monitor.sh"), join(identical, "scripts", "external-monitor.sh"));
    const out = execFileSync("bun", ["scripts/check-vendored.ts", "--backend-dir", identical], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    expect(out).toContain("F1 mirror gate pass");
  });
});
