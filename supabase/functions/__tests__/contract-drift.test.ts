/**
 * Contract drift: does every declaration of what exists match what exists?
 *
 * Four registries in this repository describe things nobody derives from
 * anything, and nothing checks that they agree:
 *
 * | Registry   | Declares                                     | Read by                  |
 * |------------|----------------------------------------------|--------------------------|
 * | migration files | the schema                            | the deploy, and the audits |
 * | `config.toml`    | which functions skip JWT verification  | the edge runtime          |
 * | `pg_cron`        | which endpoints run on a schedule      | production                |
 * | the code        | which buckets, routes and env keys are used | production            |
 *
 * The schema registry is now the oracle's business, because it is derived. The
 * other three are hand-maintained, and this file is what catches them drifting.
 *
 * ## The finding that motivates it
 *
 * **Seven of the sixteen scheduled jobs that post to `/functions/v1/` name
 * functions that do not exist.** Six of them are duplicates: the function was
 * renamed — `localization` became `api-v1-localization`,
 * `process-automation-queue` became `api-v1-email/process/automation`,
 * `recompress-images-cron` became `api-v1-images/recompress` — and the old entry
 * was never unscheduled, so both the working job and the 404 have been firing.
 *
 * The seventh is worse. `https://api.foodshare.club/functions/v1/domain-monitor`
 * runs every six hours and **no `domain-monitor` function exists anywhere in
 * this repository** — not as a function, not as a script, not as a workflow. It
 * is a capability that is scheduled and dark, and nothing reports it, because a
 * job that posts into the void succeeds at its own job.
 *
 * That is the same failure the relation audit found in the database, with an
 * HTTP request instead of a query: a call to a name nothing answers. It is
 * checkable, because the catalog has every scheduled command and the disk has
 * every function.
 *
 * The figures above are the ones that matter, and they are not the ones an
 * earlier version of this file used: it said "seven of the 78 scheduled jobs",
 * counting every job as if it posted to a function, when only 16 of the 72 do.
 * As a proportion of the *targeted* schedule the defect was 7 in 16 — nearly
 * half — and the 78 made it look like a nine percent rounding error. The live
 * figures are in the table at the top of `docs/oracle.md` and are asserted by
 * `__tests__/doc-drift.test.ts`; the count a number belongs to is as much a
 * part of the claim as the number.
 */

import { assert, assertEquals } from "@std/assert";

import { assertCatalogIsCurrent, schema } from "../../oracle/read.ts";
import { walkTypeScript } from "./lib/scan.ts";
import { ownsCorpus } from "./lib/ownership.ts";

const s = schema();
assertCatalogIsCurrent(s);

const FUNCTIONS_DIR = new URL("../", import.meta.url);
const CONFIG_TOML = new URL("../../config.toml", import.meta.url);

Deno.test("contract: localization handlers are included in the deployment module graph", async () => {
  const entrypoint = new URL("api-v1-localization/index.ts", FUNCTIONS_DIR);
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "info",
      "--json",
      "--config",
      new URL("deno.json", FUNCTIONS_DIR).pathname,
      entrypoint.href,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  const graph = JSON.parse(new TextDecoder().decode(result.stdout));
  const modules = new Set(graph.modules.map((module: { specifier: string }) => module.specifier));
  const handlersDir = new URL("./handlers/", entrypoint);
  let handlers = 0;
  for (const file of Deno.readDirSync(handlersDir)) {
    if (!file.isFile || !file.name.endsWith(".ts")) continue;
    handlers++;
    assert(
      modules.has(new URL(file.name, handlersDir).href),
      `${file.name} missing from module graph`,
    );
  }
  assert(handlers > 0, "No localization handlers found; module graph check would be empty");
});

// =============================================================================
// The function registry
// =============================================================================

/** A directory that is served as an edge function. */
function registeredFunctions(): Set<string> {
  const out = new Set<string>();
  for (const entry of Deno.readDirSync(FUNCTIONS_DIR)) {
    if (!entry.isDirectory) continue;
    if (entry.name.startsWith("_") || entry.name === "node_modules") continue;
    if (!Deno.statSync(new URL(`${entry.name}/index.ts`, FUNCTIONS_DIR)).isFile) continue;
    out.add(entry.name);
  }
  return out;
}

const registered = registeredFunctions();

/** `[functions.NAME]` entries, and whether each sets `verify_jwt = false`. */
function configEntries(): Map<string, { verifyJwtFalse: boolean }> {
  const out = new Map<string, { verifyJwtFalse: boolean }>();
  const text = Deno.readTextFileSync(CONFIG_TOML);
  for (
    const m of text.matchAll(
      /\[functions\.([a-z0-9-]+)\]([\s\S]*?)(?=\n\[|$)/g,
    )
  ) {
    out.set(m[1], { verifyJwtFalse: /verify_jwt\s*=\s*false/.test(m[2]) });
  }
  return out;
}

const config = configEntries();

Deno.test("contract: the function registry is not silently empty", () => {
  assert(
    registered.size > 25,
    `only ${registered.size} functions found on disk; the walk stopped and ` +
      "every check below is now a no-op",
  );
  assert(
    config.size > 25,
    `only ${config.size} entries in config.toml; every ` +
      "`verify_jwt` check below is now a no-op",
  );
  assert(
    s.cronJobs.length > 40,
    `only ${s.cronJobs.length} scheduled jobs in the catalog; the target check ` +
      "is running on almost nothing",
  );
});

/** `main` is the edge-runtime router, not an endpoint, so it has no entry. */
const NON_ENDPOINTS = new Set(["main"]);

Deno.test("contract: every function on disk is declared in config.toml", () => {
  // CLAUDE.md records the failure mode: a function missing from `config.toml`
  // does not get `verify_jwt = false`, and an unauthenticated call to it is
  // answered with a 401. It is listed under Common Pitfalls as the cause of a
  // webhook returning 401, which means it has happened.
  //
  // `main` is expected to be absent — it is the edge-runtime router rather
  // than an endpoint, and it is not reached through Kong. Everything else must
  // be declared, because the file is the only place `verify_jwt` is set.
  const undeclared = [...registered]
    .filter((f) => !config.has(f) && !NON_ENDPOINTS.has(f))
    .sort();

  assertEquals(
    undeclared,
    [],
    "These functions are served but not declared in config.toml, so the edge " +
      "runtime applies its default JWT requirement to them. Anything calling " +
      "them without a token — a webhook, a cron job, another service — gets a " +
      "401, and the response says nothing about the missing entry.\n" +
      "  main is excluded: it is the router, not an endpoint.\n" +
      undeclared.map((f) => `  - ${f}`).join("\n"),
  );
});

Deno.test("contract: every function declared in config.toml exists on disk", () => {
  const missing = [...config.keys()]
    .filter((f) => !registered.has(f))
    .sort();
  assertEquals(
    missing,
    [],
    "config.toml declares functions that are not on disk. A declared function " +
      "the runtime cannot find is a config entry that looks like coverage and " +
      "provides none.\n" +
      missing.map((f) => `  - ${f}`).join("\n"),
  );
});

Deno.test("contract: the function table in CLAUDE.md is the real one", () => {
  // The table is the first thing anyone reads about which functions exist, and
  // it was wrong in the way a hand-maintained list is always wrong: it listed
  // 28 functions, `supabase/config.toml` declared 28, and the two disagreed,
  // because `api-v1-vector-search` and `api-v1-tailscale-webhook` were in the
  // config and in neither count. Two lists that are both "28" is the most
  // dangerous kind of drift, because checking either one in isolation passes.
  //
  // Held against `config.toml` rather than against the filesystem, so the doc
  // and the thing the runtime reads are the same thing. `main` is expected: it
  // is the router and has no config entry.
  //
  // The table is a contract of the repo that owns the function registry; a
  // vendored checkout points at `foodshare-backend/CLAUDE.md` instead of
  // carrying a second copy. See `ownsCorpus`.
  if (!ownsCorpus()) return;

  const CLAUDE_MD = new URL("../../../CLAUDE.md", import.meta.url);
  const table = Deno.readTextFileSync(CLAUDE_MD).split("## Functions (")[1]
    ?.split("## Key Patterns")[0] ?? "";

  const listed = new Set(
    [...table.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]),
  );

  const missing = [...config.keys()].filter((f) => !listed.has(f)).sort();
  const extra = [...listed].filter((f) => !config.has(f) && !NON_ENDPOINTS.has(f)).sort();

  assertEquals(
    { missing, extra },
    { missing: [], extra: [] },
    "The function table in CLAUDE.md disagrees with supabase/config.toml.\n" +
      (missing.length
        ? `  declared in config.toml but absent from the table: ${missing.join(", ")}\n`
        : "") +
      (extra.length
        ? `  listed in the table but absent from config.toml: ${extra.join(", ")}\n`
        : "") +
      "  Both lists being the same length is what hid this; the table is the " +
      "first thing anyone reads, so it should not be able to be quietly wrong.",
  );
});

// =============================================================================
// Scheduled work
// =============================================================================

/**
 * The paths a function serves, and whether they could be read at all.
 *
 * Dispatch is not uniform here, and reading one shape and calling it the whole
 * is the mistake that keeps recurring in this repository — a view's definition
 * truncated to 300 characters, a function's routes read from `index.ts` when
 * they live in `handlers/`. There are four shapes:
 *
 *   1. `path.endsWith("/process")` — `api-v1-email`, and it matches the whole
 *      path, so a two-segment route is captured whole.
 *   2. `"process-queue": lazyImport(...)` — a map whose keys are the routes and
 *      whose values are the handlers, indexed by a *normalized* sub-path.
 *   3. `switch (route.resource) { case "recompress": ... }` — `api-v1-images`,
 *      through a shared `parseRoute`.
 *   4. Nothing matched.
 *
 * Shape 2 is why comparison is by normalized token rather than by raw path.
 * `getSubPath` in `api-v1-localization` returns `backfill-posts` — no leading
 * slash — and the map is keyed that way, so a cron path of `/backfill-posts`
 * and a route token of `backfill-posts` are the same route. Getting this wrong
 * is not a detail: read it naively and eleven working jobs look like eleven
 * 404s.
 *
 * Shape 4 is the one that matters. A function whose routes cannot be read must
 * not be reported as serving only `/`, because "serves nothing" and "we could
 * not tell" are different answers and only one of them is a finding. So this
 * returns `readable: false` and the caller skips rather than reports — the same
 * rule the catalog reader follows for a relation it cannot describe.
 */
function routesOf(fn: string): { routes: Set<string>; readable: boolean } {
  const routes = new Set<string>(["/"]);
  const dir = new URL(`${fn}/`, FUNCTIONS_DIR);
  if (!Deno.statSync(dir).isDirectory) return { routes, readable: false };

  let matched = 0;

  // `walkTypeScript` returns paths relative to the directory it was given, so
  // they resolve against `dir` — not the functions root, which put
  // `api-v1-images/handlers/cleanup.ts` at `functions/handlers/cleanup.ts` and
  // then reported the function served no routes at all.
  for (const entry of walkTypeScript(dir).map((p) => new URL(p, dir))) {
    const src = Deno.readTextFileSync(entry);

    // Shape 1: a whole-path comparison. `endsWith` is why two-segment routes
    // survive here intact.
    for (
      const m of src.matchAll(
        /\b(?:path|pathname|subPath|url)\s*(?:\.\s*endsWith\s*\(\s*|\s*===?\s*|\s*!==?\s*)\s*["'`]([^"'`]*)["'`]/g,
      )
    ) {
      if (m[1].trim()) {
        routes.add(m[1].trim());
        matched++;
      }
    }

    // Shape 2: a handler map, keyed by route. The value is only read to tell a
    // route table apart from an arbitrary object literal, and the import path
    // pins the token to a file that has to exist.
    for (
      const m of src.matchAll(
        /["'`]([a-z0-9_][a-z0-9_/-]*)["'`]\s*:\s*(?:lazyImport|handle[A-Z]|import\(|\(|\[)/g,
      )
    ) {
      routes.add(m[1]);
      matched++;
    }

    // Shape 3: `switch (route.resource) { case "x": ... }`, and the direct
    // `route.resource === "x"` form. Scoped to `.resource` because `case "x"`
    // on its own is any switch in any file.
    for (
      const m of src.matchAll(
        /switch\s*\(\s*[\w.]*resource\s*\)\s*\{([\s\S]*?)\n\s*\}/g,
      )
    ) {
      for (const c of m[1].matchAll(/case\s+["'`]([a-z0-9_-]+)["'`]/g)) {
        routes.add(c[1]);
        matched++;
      }
    }
    for (
      const m of src.matchAll(
        /[\w.]*resource\s*===?\s*["'`]([a-z0-9_-]+)["'`]/g,
      )
    ) {
      routes.add(m[1]);
      matched++;
    }
  }

  return { routes, readable: matched > 0 };
}

/**
 * Does a function serve a cron path?
 *
 * Shape 1 yields the whole path, so an exact match is checked first and a
 * two-segment route like `/process/automation` is only ever satisfied
 * exactly. Shape 2 and 3 yield bare tokens, so the last segment is also
 * accepted. That is the normalization the dispatcher itself performs, and it is
 * deliberately generous: this checks that the route *exists*, not that the
 * function rejects a path with an extra segment.
 */
function serves(fn: string, path: string, readable: boolean): boolean {
  if (!readable) return true; // the caller skips these; see the doc comment
  const norm = path.replace(/^\/+|\/+$/g, "");
  if (norm === "") return true;
  const { routes } = routesOf(fn);
  if (routes.has(path) || routes.has(`/${norm}`)) return true;
  const last = norm.split("/").pop()!;
  return routes.has(last) || routes.has(`/${last}`);
}

interface CronTarget {
  schedule: string;
  function: string;
  path: string;
  url: string;
}

function cronTargets(): CronTarget[] {
  const out: CronTarget[] = [];
  for (const job of s.cronJobs) {
    for (
      const m of job.command.matchAll(/["'`]([^"'`]*?functions\/v1\/([a-z0-9-]+)([^"'`]*))["'`]/g)
    ) {
      const path = (m[3] || "/").split("?")[0].replace(/\/+$/, "") || "/";
      out.push({ schedule: job.schedule, function: m[2], path, url: m[1] });
    }
  }
  return out;
}

/**
 * The one dead target that is allowed to still be dead.
 *
 * A schedule is pinned rather than deleted for a reason given in
 * `20261014000000_unschedule_jobs_for_removed_functions.sql`: there is no
 * `domain-monitor` function anywhere in this repository, so the job is not
 * debris from a rename, it is a capability that is scheduled and dark. Removing
 * the job would make the schedule look clean and would delete the only record
 * that domain-expiry monitoring is supposed to happen here.
 *
 * So the check is not disabled, it is *narrowed*: the dead set must be exactly
 * this, which means a second dead target fails the build while this one is named
 * in the output every run. A pin that can absorb a new finding is not a pin.
 */
const KNOWN_DEAD_TARGETS: Record<string, string> = {
  "domain-monitor": "No domain-monitor function exists in this repository. Capability gap, " +
    "not a rename. Needs an implementation or a written decision that domains " +
    "are not monitored here — not a schedule change.",
};

Deno.test("contract: a job name is one live job", () => {
  // pg_cron does not make `jobname` unique: `cron.schedule` inserts a new row
  // whatever already carries the name, so a name held by two rows fires on
  // its own tick each. No query in the estate joins `cron.job` to the work
  // the job should be doing, so a doubled schedule is a success that does
  // the work twice and reports nothing — the same silence as the dead target
  // above, one level removed: a 404 is invisible, and so is a job that runs
  // twice.
  //
  // This is how the estate got here: the baseline migration snapshots 40
  // jobs, and `20260209000001_cron_jobs_selfhosted.sql` re-schedules all 37
  // of the self-hosted era on top of them, so for as long as both have been
  // applied every one of those 37 has been running twice per tick. Four of
  // the 37 even carry a different command in the old copy (vault-secret URLs
  // replaced by kong URLs in the self-hosted rewrite), which means the old
  // copy has been firing a stale call alongside the live one.
  // `20261108180000_deduplicate_cron_jobs.sql` keeps the newest row per
  // duplicated name and unschedules the rest by jobid.
  const counts = new Map<string, number>();
  for (const job of s.cronJobs) {
    counts.set(job.jobName, (counts.get(job.jobName) ?? 0) + 1);
  }
  const duplicated = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([name, n]) => `  - ${name} (x${n})`)
    .sort();

  assertEquals(
    duplicated,
    [],
    "These job names are held by more than one row in cron.job, so the work " +
      "runs once per row per tick. Keep the newest copy of each duplicated " +
      "name and unschedule the rest by jobid — by id, never by name, because " +
      "a name is not unique in pg_cron (the same mistake the self-hosted " +
      "migration made, recorded in 20261014000000).\n" +
      duplicated.join("\n"),
  );
});

Deno.test("contract: every scheduled job posts to a function that exists", () => {
  const targets = cronTargets();
  assert(
    targets.length > 10,
    `only ${targets.length} scheduled endpoints found among the catalog's ` +
      `${s.cronJobs.length} jobs. The extraction is wrong, and the check below ` +
      "is passing on nothing.",
  );

  const dead = new Map<string, CronTarget[]>();
  for (const t of targets) {
    if (registered.has(t.function)) continue;
    dead.set(t.url, [...(dead.get(t.url) ?? []), t]);
  }

  // Pinned, not disabled. See KNOWN_DEAD_TARGETS above.
  const unexplained = [...dead.entries()]
    .filter(([url]) => !KNOWN_DEAD_TARGETS[url.split("/").pop()!.split("?")[0]])
    .map(([url, ts]) => ({
      url,
      schedules: [...new Set(ts.map((x) => x.schedule))].sort(),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));

  // The pins are asserted to still be real. A pin for a job that has been
  // unscheduled is a pin nobody is maintaining, and it would let the next dead
  // target through by looking like an addition to a set that already had one.
  for (const [fn, reason] of Object.entries(KNOWN_DEAD_TARGETS)) {
    const stillScheduled = [...dead.keys()].some((u) => u.includes(`/functions/v1/${fn}`));
    if (!stillScheduled) {
      throw new Error(
        `KNOWN_DEAD_TARGETS pins "${fn}", but no scheduled job targets it ` +
          `any more. Either the function now exists — remove the pin — or the ` +
          `job was unscheduled, in which case the reason it was given ` +
          `(${reason}) no longer applies and the decision should be recorded ` +
          `in the migration that unscheduled it.`,
      );
    }
  }

  assertEquals(
    unexplained,
    [],
    "These scheduled jobs post to functions that do not exist. `net.http_post` " +
      "records a request id whatever the response and pg_cron marks the job " +
      "succeeded because the query succeeded, so a 404 is invisible. A new " +
      "entry here is a capability that is scheduled and dark, or debris from a " +
      "rename that should have been unscheduled.\n" +
      unexplained.map((t) => `  - ${t.url}\n      ${t.schedules.join(", ")}`).join("\n"),
  );
});

Deno.test("contract: every scheduled job posts to a path its function serves", () => {
  const wrong: string[] = [];
  const unreadable = new Set<string>();

  for (const t of cronTargets()) {
    if (!registered.has(t.function)) continue;
    // The function's own path is the part after the name. `endsWith` dispatch
    // means `/process` is served by a handler that also serves `/`, so an exact
    // match is the right question and a prefix is not.
    const { routes, readable } = routesOf(t.function);
    if (!readable) {
      // Not a finding, and specifically *not* "this function serves only /".
      // It is the audit saying it could not read the dispatch, and the
      // difference is the whole point: a check that reports its own blindness as
      // a result is worse than one that admits it.
      unreadable.add(t.function);
      continue;
    }
    if (serves(t.function, t.path, readable)) continue;
    wrong.push(
      `${t.url}\n      ${t.function} serves ${[...routes].sort().join(", ")}`,
    );
  }

  // Skipping an unreadable function is correct — "I could not tell" is not
  // "serves nothing" — but it is also a way for the check to stop working
  // without failing. Break a route-extraction pattern and every affected
  // function quietly becomes unreadable, the check reports fewer findings, and
  // a green run means less than it did. So the count is a floor, not a note.
  //
  // The floor is on *functions*, not jobs, so one function with many cron jobs
  // cannot prop up a number on its own.
  const targeted = new Set(
    cronTargets().map((t) => t.function).filter((f) => registered.has(f)),
  );

  assert(
    unreadable.size <= 1,
    `${unreadable.size} of ${targeted.size} functions that scheduled jobs ` +
      `target have routes this audit cannot read, so their jobs are being ` +
      `skipped rather than checked: ${[...unreadable].sort().join(", ")}.` +
      `\n\nThis is almost always a route-extraction pattern that stopped ` +
      `matching — a new dispatch shape, a renamed variable — rather than ` +
      `genuinely unreadable code. The first version of this check skipped ` +
      `unreadable functions with no floor, and removing the \`switch ` +
      `(route.resource)\` pattern for api-v1-images turned two real checks into ` +
      `zero while the suite stayed green.`,
  );

  if (unreadable.size > 0) {
    console.error(
      `  contract: skipped ${unreadable.size} function(s) whose routes could ` +
        `not be read: ${[...unreadable].sort().join(", ")}`,
    );
  }

  assertEquals(
    wrong,
    [],
    "These scheduled jobs post to a path their function does not dispatch. " +
      "The edge runtime answers 404 and the job records a request id.\n" +
      wrong.map((w) => `  - ${w}`).join("\n"),
  );
});

Deno.test("contract: no two scheduled jobs do the same work", () => {
  // Six of the dead entries above are a rename's leftovers, and the way to
  // tell a leftover from a genuine schedule is that the same endpoint appears
  // twice under two names. Checking for that is what stops the next rename
  // leaving the same debris: a duplicate is visible as a duplicate rather than
  // as six dead jobs nobody attributes to one change.
  const byPath = new Map<string, Set<string>>();
  for (const t of cronTargets()) {
    const set = byPath.get(t.path) ?? new Set<string>();
    set.add(t.function);
    byPath.set(t.path, set);
  }

  // Pair up by the *file* each function dispatches, which is the stable part.
  const sameWork = [...byPath.entries()]
    .filter(([, fns]) => fns.size > 1)
    .map(([path, fns]) => `${path} — ${[...fns].sort().join(" and ")}`);

  // This is a disclosure, not a failure: the duplicates are real and are being
  // fixed by unscheduling the dead entries, and asserting the set is empty
  // would fail the day it is fixed. The check is here so that a *new* duplicate
  // is not added quietly, and so the count is written down.
  assertEquals(
    sameWork,
    [],
    "These paths are scheduled under more than one function name. One of the " +
      "names is dead, so this is the debris a rename leaves behind; a new " +
      "entry here means the same work now runs twice.\n" +
      sameWork.map((w) => `  - ${w}`).join("\n"),
  );
});

/**
 * A trigger-returning function no trigger fires. Pinned, not disabled: a
 * non-empty set fails the build, and a pin here needs a written reason the
 * way a dead cron target does, plus the reverse check below so a pin whose
 * reason has gone away cannot stay silent.
 *
 * `20261108220000_drop_orphan_trigger_functions.sql` emptied this set: thirty
 * trigger functions survived the rewrites that replaced them, and the
 * migration drops each one. The set is expected to stay empty; anything that
 * re-enters it is either a rewrite that forgot its cleanup or a function
 * parked ahead of a trigger nobody has written yet, and neither may land
 * quietly.
 */
const KNOWN_ORPHAN_TRIGGER_FUNCTIONS: Record<string, string> = {};

Deno.test("contract: every trigger function is attached to a trigger", () => {
  // A function that returns `trigger` is not callable code as far as the
  // database is concerned: PostgreSQL invokes it only through a trigger row.
  // But it is still a function — it has a signature in `pg_proc`, it may
  // hold EXECUTE grants, and an RPC call to it executes its body whether or
  // not a trigger would have. The only reason an unattached trigger function
  // is harmless is if it is dormant by design — and nothing in the schema
  // records that intent, so the distinction is invisible by construction.
  //
  // This is how the estate got here: a generation of migrations rewrote
  // trigger behavior in place — a new function plus `DROP TRIGGER` /
  // `ADD TRIGGER` — and the old functions were left behind. Rewrites that
  // replace a trigger are the norm in this corpus, and a rewrite that keeps
  // its own function but drops its predecessor's is the exception, so a
  // leftover is the expected residue, not an anomaly to excuse.
  //
  // The two floors keep the check from being silently empty in the other
  // direction: a catalog whose trigger walk stopped would make every
  // function look attached, and one whose function walk stopped would have
  // nothing left to check.
  assert(
    s.triggers.length >= 100,
    `only ${s.triggers.length} triggers in the catalog; the trigger walk ` +
      "stopped and every orphan check below is now a no-op",
  );
  const triggerFunctions = s.functions.filter((f) => f.returns === "trigger");
  assert(
    triggerFunctions.length >= 75,
    `only ${triggerFunctions.length} trigger-returning functions in the ` +
      "catalog; the function walk stopped and the orphan check below is a no-op",
  );

  const attached = new Set(s.triggers.map((t) => t.function));
  const orphans = triggerFunctions
    .filter(
      (f) =>
        !attached.has(`${f.schema}.${f.name}`) &&
        !KNOWN_ORPHAN_TRIGGER_FUNCTIONS[`${f.schema}.${f.name}`],
    )
    .map((f) => `  - ${f.schema}.${f.name}(${f.args})`)
    .sort();

  assertEquals(
    orphans,
    [],
    "These functions return `trigger` but no trigger fires them. Their bodies " +
      "still run when an RPC call reaches them, and nothing in the schema " +
      "records whether one is dormant by design or dead debris a rewrite left " +
      "behind. Drop the dead ones, or pin each survivor in " +
      "KNOWN_ORPHAN_TRIGGER_FUNCTIONS with a written reason.\n" +
      orphans.join("\n"),
  );

  // A pin whose reason has gone away is a stale claim, not an exception.
  for (const [fn, reason] of Object.entries(KNOWN_ORPHAN_TRIGGER_FUNCTIONS)) {
    const stillOrphan = triggerFunctions.some(
      (f) => `${f.schema}.${f.name}` === fn && !attached.has(fn),
    );
    assert(
      stillOrphan,
      `KNOWN_ORPHAN_TRIGGER_FUNCTIONS pins "${fn}" ("${reason}"), but it is ` +
        "no longer an orphan — remove the pin",
    );
  }
});

// =============================================================================
// Index redundancy
// =============================================================================

/** `pg_get_indexdef`, normalized for comparison. */
function norm(t: string): string {
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}

interface ParsedIndex {
  name: string;
  unique: boolean;
  primary: boolean;
  am: string;
  /** Key columns, in order, with their options (`col DESC`) intact. */
  keys: string[];
  include: string[] | null;
  predicate: string | null;
}

/**
 * Parse a `pg_get_indexdef` string. The shape is fixed by PostgreSQL:
 * `CREATE [UNIQUE] INDEX name ON [ONLY] table USING am (keys) [INCLUDE
 * (cols)] [WHERE predicate]`. Expressions in the key list keep their
 * rendering, which is exactly what makes two indexes on the same expression
 * comparable as equal.
 */
function parseIndex(name: string, def: string): ParsedIndex | null {
  const header = /^CREATE (UNIQUE )?INDEX \S+ ON (ONLY )?\S+ USING (\w+)\s/.exec(def);
  if (!header) return null;
  const rest = def.slice(header[0].length);
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "(") depth++;
    else if (rest[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const keys = rest.slice(1, end).split(",").map(norm);
  let tail = rest.slice(end + 1);
  let include: string[] | null = null;
  const incl = /\bINCLUDE\s*\(([^)]*)\)/i.exec(tail);
  if (incl) {
    include = incl[1].split(",").map(norm);
    tail = tail.slice(0, incl.index) + tail.slice(incl.index + incl[0].length);
  }
  const where = /\bWHERE\b([\s\S]*)$/.exec(tail);
  return {
    name,
    unique: header[1] !== undefined,
    primary: false,
    am: header[3].toLowerCase(),
    keys,
    include,
    predicate: where ? norm(where[1]) : null,
  };
}

/**
 * The redundant set, computed the way the catalog reader can: from the
 * `definition` strings, because the catalog carries no column-level index
 * structure of its own.
 *
 * Two rules, both structural — a redundant index is dead weight on every
 * write to its table whether or not the planner ever chose it:
 *
 *  1. Exact duplicate: same table, access method, key list (order and
 *     options included) and predicate. The non-unique member is droppable;
 *     a unique member enforces something the plain one does not, and a
 *     plain member next to a unique one covers nothing the unique lacks.
 *     Two unique members would each enforce what the other does not lose —
 *     that pair is a judgment, not a mechanical drop, and is reported as
 *     such.
 *
 *  2. Left-prefix: `a`'s key list is a strict prefix of `b`'s, same access
 *     method, neither predicate, and `a` carries no INCLUDE columns. Every
 *     scan `a` can serve, `b` serves — `b`'s extra key columns extend the
 *     left prefix, they do not shorten it — while `a`'s INCLUDE columns, if
 *     any, would not be covered by `b`, so they keep `a` alive. `a` must be
 *     plain: dropping a unique index would drop an enforcement, and a
 *     predicate changes the index's population entirely.
 *
 * Primary keys never drop: the key is the table's identity, and the
 * catalog marks them rather than trusting the definition's wording.
 */
function redundantIndexes(): { drop: string; reason: string }[] {
  const byTable = new Map<string, ParsedIndex[]>();
  for (const ix of s.catalog.indexes) {
    const parsed = parseIndex(ix.name, ix.definition);
    if (!parsed) continue;
    parsed.primary = ix.primary;
    const list = byTable.get(ix.table) ?? [];
    list.push(parsed);
    byTable.set(ix.table, list);
  }
  const reasons = new Map<string, string[]>();
  const note = (name: string, reason: string) => {
    const list = reasons.get(name) ?? [];
    if (!list.includes(reason)) list.push(reason);
    reasons.set(name, list);
  };
  for (const [table, indexes] of byTable) {
    const secondary = indexes.filter((i) => !i.primary);
    for (let a = 0; a < secondary.length; a++) {
      for (let b = a + 1; b < secondary.length; b++) {
        const x = secondary[a];
        const y = secondary[b];
        if (x.am !== y.am) continue;
        const sameKeys = x.keys.length === y.keys.length && x.keys.every((k, i) => k === y.keys[i]);
        const samePred = (x.predicate ?? "") === (y.predicate ?? "");
        if (sameKeys) {
          if (!samePred) continue;
          if (x.unique && y.unique) {
            note(x.name, `${table}: unique index equal to ${y.name} — a judgment, not a drop`);
            continue;
          }
          const plain = x.unique ? y : x;
          const keeper = x.unique ? x : y;
          note(
            plain.name,
            `${table}: duplicate of ${keeper.name} (same keys ${x.keys.join(", ")})`,
          );
        } else {
          // Strict prefix, either order: the shorter key list is the one a
          // covering index could replace.
          const [shorter, longer] = x.keys.length <= y.keys.length ? [x, y] : [y, x];
          if (
            shorter.keys.length < longer.keys.length &&
            shorter.keys.every((k, i) => longer.keys[i] === k) &&
            shorter.predicate === null &&
            longer.predicate === null &&
            shorter.include === null &&
            !shorter.unique
          ) {
            note(
              shorter.name,
              `${table}: left prefix of ${longer.name} (${shorter.keys.join(", ")} ⊂ ${
                longer.keys.join(", ")
              })`,
            );
          }
        }
      }
    }
  }
  return [...reasons.entries()].map(([drop, rs]) => ({ drop, reason: rs.join("; ") }));
}

Deno.test("contract: no redundant indexes survive in the catalog", () => {
  // Every redundant index is paid for on every INSERT, UPDATE and DELETE of
  // its table: the write path maintains it and the planner — which sees the
  // covering index — rarely chooses it. The estate accumulated these the way
  // it accumulates everything: a constraint arrives with its own index, the
  // plain lookup index is written beside it (or the other way around), and
  // neither migration is the one that removes the other's leftover.
  //
  // The floors keep the check from being silently empty: a catalog whose
  // index walk stopped would have nothing to compare, and the comparison
  // above would pass on an empty set.
  assert(
    s.catalog.indexes.length >= 500,
    `only ${s.catalog.indexes.length} indexes in the catalog; the index walk ` +
      "stopped and the redundancy check below is now a no-op",
  );

  const redundant = redundantIndexes().sort((a, b) => a.drop.localeCompare(b.drop));

  assertEquals(
    redundant,
    [],
    "These indexes are dead weight: each one is maintained on every write to " +
      "its table while a surviving index (named in the reason) covers the " +
      "same scans. `20261108230000_drop_redundant_indexes.sql` dropped the " +
      "set measured against this corpus; a new entry here means a migration " +
      "added a constraint and a lookup index at once and kept both.\n" +
      redundant.map((r) => `  - ${r.drop}: ${r.reason}`).join("\n"),
  );
});
