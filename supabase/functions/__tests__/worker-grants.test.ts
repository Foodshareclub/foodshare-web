/**
 * Grant closure: does `job_worker` hold everything the Rust worker's SQL needs?
 *
 * `docs/rust-migration.md` § 7 records why this exists in the form it takes
 * here:
 *
 * > Integration is run against a real PostgreSQL 17, and that is not
 * > ceremony. It has already caught a grant set that was missing
 * > `email_templates` and `newsletter_campaigns` (invisible to a superuser,
 * > fatal to the first backfill run)
 *
 * A superuser is not subject to privilege checks at all, so an integration
 * suite running as one cannot see a missing grant — it sees the query succeed.
 * The grant has to be checked against the *catalog*, which is the only place
 * the two facts sit side by side: what the code names, and what the role holds.
 *
 * ## Why it is a Deno test
 *
 * The subject is Rust and the schema source is `catalog.json`, which the Deno
 * suite already reads for three other audits. Putting it here means it runs in
 * the existing test job with no second harness and no third language, and it
 * sits beside the audits that answer the same question for the other half of
 * the system. `services/` stays gated by its own suite; this is not a
 * substitute for it, it is the one check that suite structurally cannot do.
 *
 * ## Both directions
 *
 * The direction that has bitten is *missing* grants, and it is the one that
 * matters. But the opposite is checked too, because a grant nobody uses is a
 * grant that widens the blast radius of a compromised worker for no reason —
 * and because a test that only ever fails in one direction is a test that only
 * ever gets taught one lesson.
 */

import { assert, assertEquals } from "@std/assert";

import { assertCatalogIsCurrent, schema } from "../../oracle/read.ts";

const s = schema();
assertCatalogIsCurrent(s);

/** The worker's SQL lives in Rust string literals. */
const FS_DB_SRC = new URL("../../../services/crates/fs-db/src/", import.meta.url);

const WORKER_ROLES = ["job_worker", "job_worker_app"];

// =============================================================================
// What the code names
// =============================================================================

/** Relations and functions the crate names, with CTE names excluded. */
interface References {
  relations: Map<string, string[]>;
  functions: Map<string, string[]>;
  /** (relation, operation) pairs the SQL performs, per file. */
  operations: Map<string, Set<string>>;
  /** Every file that was read, so "read nothing" is visible. */
  filesRead: string[];
}

/**
 * Common table expressions, so their names are not mistaken for relations.
 *
 * `FROM claimed` appears in five of the six query modules and `claimed` is a
 * CTE, not a table. Reading it as a relation reports a table that does not
 * exist — the exact failure this audit exists to prevent, one level down.
 */
function cteNames(sql: string): Set<string> {
  const out = new Set<string>();
  // `WITH name AS (`, `, name AS (` including `RECURSIVE`.
  for (
    const m of sql.matchAll(
      /(?:WITH|,)\s*(?:RECURSIVE\s+)?([a-z_][a-z0-9_]*)\s*(?:\([^)]*\))?\s+AS\s*(?:\(|NOT\s+MATERIALIZED|MATERIALIZED)/gi,
    )
  ) {
    out.add(m[1].toLowerCase());
  }
  return out;
}

/** Set-returning functions called in a FROM position; not relations. */
const FROM_FUNCTIONS = new Set([
  "unnest",
  "generate_series",
  "generate_subscripts",
  "jsonb_array_elements",
  "jsonb_array_elements_text",
  "json_array_elements",
  "regexp_split_to_table",
  "lateral",
]);

/**
 * Relations named by a `FROM`/`JOIN`/`INTO`/`UPDATE`/`DELETE FROM`.
 *
 * Two exclusions, and both were added because their absence produced a
 * confident wrong answer rather than a visible one.
 *
 * **CTEs.** `FROM claimed` appears in five of the six query modules and
 * `claimed` is a common table expression, not a table.
 *
 * **Function calls.** `FROM public.claim_automation_queue($1, $2)` is a
 * set-returning function in a FROM position — a very common shape for a
 * queue claim — and reading the name as a relation reports a table that does
 * not exist *and* a separate missing grant for the same name, so one real
 * finding arrived as two and neither said what it was. A `(` after the name is
 * what distinguishes them.
 *
 * Only `public.`-qualified names are collected. An unqualified name is
 * ambiguous — a CTE, a table function, or a table resolved through
 * `search_path` — and this function's job is to produce names the catalog can
 * answer a question about rather than to guess.
 */
function relationsIn(sql: string): string[] {
  const ctes = cteNames(sql);
  const out = new Set<string>();
  for (
    const m of sql.matchAll(
      /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(public\.[a-z_][a-z0-9_]*)/gi,
    )
  ) {
    // A `(` after the name — with or without space — makes it a function call
    // rather than a relation, and that is decided here rather than in the
    // pattern.
    //
    // It was a negative lookahead in the pattern first, which backtracked the
    // greedy name by one character to satisfy it: `claim_automation_queue`
    // arrived as `claim_automation_queu`, and every function was reported as
    // both a missing table and a missing grant. Two wrong answers, both
    // confident, both from one character of backtracking. Reading the tail out
    // of the source has no such failure mode.
    const tail = sql.slice(m.index + m[0].length);
    if (/^\s*\(/.test(tail)) continue;
    const name = m[1].slice("public.".length);
    if (!ctes.has(name)) out.add(name);
  }
  return [...out];
}

/**
 * (operation, relation) pairs the SQL performs.
 *
 * The name-level check above cannot tell a table the worker only reads from
 * one it deletes from: `device_tokens` was SELECT-granted and SELECT-policed,
 * which satisfied both checks, while the token cleanup the digest job
 * performs is a `DELETE`. A statement is planned before any row is
 * considered, so the missing DELETE grant fails with `permission denied`
 * even when zero tokens match — verified against a real cluster, where the
 * name-level audit reported green the whole time.
 *
 * The operation is in the source, not the catalog, so it is read out of the
 * SQL here, with the same two exclusions as `relationsIn` (CTEs and function
 * calls) because both have produced a confident wrong answer before.
 */
const OP_BY_KEYWORD: Record<string, string> = {
  FROM: "SELECT",
  JOIN: "SELECT",
  INTO: "INSERT",
  UPDATE: "UPDATE",
  "DELETE FROM": "DELETE",
};

function operationsIn(sql: string): [string, string][] {
  const ctes = cteNames(sql);
  const out: [string, string][] = [];
  for (
    const m of sql.matchAll(
      /\b(FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(public\.[a-z_][a-z0-9_]*)/gi,
    )
  ) {
    const tail = sql.slice(m.index + m[0].length);
    if (/^\s*\(/.test(tail)) continue;
    const name = m[2].slice("public.".length);
    if (ctes.has(name)) continue;
    out.push([name, OP_BY_KEYWORD[m[1].toUpperCase()] ?? m[1].toUpperCase()]);
  }
  return out;
}

/** Schema-qualified functions called anywhere in the SQL. */
function functionsIn(sql: string): string[] {
  const ctes = cteNames(sql);
  const out = new Set<string>();
  for (const m of sql.matchAll(/\bpublic\.([a-z_][a-z0-9_]*)\s*\(/gi)) {
    const name = m[1];
    if (ctes.has(name) || FROM_FUNCTIONS.has(name)) continue;
    out.add(name);
  }
  return [...out];
}

/**
 * Turn Rust string-literal escapes into the whitespace they stand for.
 *
 * A SQL query in this crate is written as
 *
 * ```
 * "SELECT slug, subject, html_content\n                 FROM public.email_templates\n ..."
 * ```
 *
 * and the escape is a backslash and an `n` in the *file*, not a newline. So the
 * character before `FROM` is `n` — a word character — and `\bFROM` does not
 * match. The relation is then simply not seen, and the over-granting check
 * reports `email_templates` as a grant the worker never uses.
 *
 * That is worth recording because it is the mirror image of every defect in
 * `docs/rust-migration.md`: the migration audit found *missing* grants, and this
 * found a *spurious* one, and both come from reading source text rather than
 * from asking something. A check that cries wolf on its first run is a check
 * nobody keeps.
 *
 * Only the whitespace escapes are unwrapped. `"` and `\'` are left alone, since
 * a quote inside SQL text is not a query boundary and unwrapping it would
 * change what the string means.
 */
function unescapeSql(src: string): string {
  return src.replace(/\\([nrt])/g, (_m, c: string) => c === "n" ? "\n" : c === "r" ? "\r" : "\t");
}

function scan(): References {
  const relations = new Map<string, string[]>();
  const functions = new Map<string, string[]>();
  const operations = new Map<string, Set<string>>();
  const filesRead: string[] = [];

  for (
    const entry of [...Deno.readDirSync(FS_DB_SRC)].sort((a, b) => a.name.localeCompare(b.name))
  ) {
    if (!entry.isFile || !entry.name.endsWith(".rs")) continue;
    filesRead.push(entry.name);
    const src = unescapeSql(
      Deno.readTextFileSync(new URL(entry.name, FS_DB_SRC)),
    );

    for (const name of relationsIn(src)) {
      relations.set(name, [...(relations.get(name) ?? []), entry.name]);
    }
    for (const name of functionsIn(src)) {
      functions.set(name, [...(functions.get(name) ?? []), entry.name]);
    }
    for (const [table, op] of operationsIn(src)) {
      operations.set(table, new Set([...(operations.get(table) ?? []), op]));
    }
  }

  return { relations, functions, operations, filesRead };
}

const refs = scan();

/** Every object `job_worker` or `job_worker_app` holds, by name. */
function grantedObjects(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const g of s.catalog.grants) {
    if (!WORKER_ROLES.includes(g.grantee)) continue;
    // `name(arg,types)` -> `name`
    const bare = g.object.replace(/\(.*\)$/, "");
    out.set(bare, [...(out.get(bare) ?? []), ...g.privileges]);
  }
  return out;
}

const granted = grantedObjects();

/**
 * Tables the worker reaches only *inside* a function it calls.
 *
 * `SELECT * FROM public.preview_automation_queue($1)` names a function, not a
 * table, so the scan above never sees `email_automation_queue` — the relation
 * the function's body reads. That only matters for `SECURITY INVOKER` bodies:
 * a `SECURITY DEFINER` function runs its own queries as its owner, so the
 * caller's grants never apply inside it. The catalog records both facts per
 * function (`securityDefiner`, `returnsSet`, `returns`), so the set is derived
 * rather than declared — a new invoker table function shows up here without
 * anyone remembering to list it.
 */
function invokerTableReads(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const name of refs.functions.keys()) {
    for (const f of s.overloads(name)) {
      if (f.securityDefiner) continue;
      if (!f.returnsSet) continue;
      const m = /^public\.([a-z_][a-z0-9_]*)$/.exec(f.returns);
      if (!m) continue;
      if (!s.relation(m[1]).ok) continue;
      out.set(m[1], [...(out.get(m[1]) ?? []), name]);
    }
  }
  return out;
}

const invokerReads = invokerTableReads();

// =============================================================================
// Coverage
// =============================================================================

Deno.test("worker grants: the scan is not silently empty", () => {
  // Every way this audit can be vacuous: no files, no relations, no functions.
  // A check that examines nothing and finds nothing is the failure this whole
  // exercise exists to remove, and it is silent by construction.
  assert(
    refs.filesRead.length >= 7,
    `only ${refs.filesRead.length} files read from fs-db; the scan stopped ` +
      "walking, and every test below is now a no-op",
  );
  assert(
    refs.relations.size >= 11,
    `only ${refs.relations.size} relations found; expected the worker's queue, ` +
      "profile and preference tables",
  );
  assert(
    refs.functions.size >= 5,
    `only ${refs.functions.size} functions found; the automation queue alone is ` +
      "four",
  );
  assert(
    invokerReads.size >= 1,
    "no SECURITY INVOKER table function the worker calls was found; either the " +
      "catalog stopped recording securityDefiner or the worker stopped calling " +
      "one, and the INVOKER table-grant test below is a no-op either way",
  );
  const writeOps = new Set<string>();
  for (const ops of refs.operations.values()) {
    for (const op of ops) if (op !== "SELECT") writeOps.add(op);
  }
  assert(
    ["INSERT", "UPDATE", "DELETE"].every((op) => writeOps.has(op)),
    `write operations found in the worker's SQL: ${[...writeOps].sort().join(", ") || "none"}. ` +
      "INSERT, UPDATE and DELETE are all there today — a missing one means the " +
      "scan stopped matching or a job lost its write-back, and the " +
      "operation-closure test below has quietly shrunk with it",
  );
  // And the catalog has to have the roles at all, or `granted` is empty and
  // every check below passes vacuously.
  for (const role of WORKER_ROLES) {
    assert(s.role(role), `role ${role} is absent from the catalog`);
  }
  assert(
    s.overloads("claim_automation_queue").length > 0,
    "the automation claim function is missing from the catalog, so the " +
      "findings below cannot be about this schema",
  );
});

// =============================================================================
// Missing grants
// =============================================================================

Deno.test("worker grants: every relation the worker's SQL names is granted to it", () => {
  const missing: string[] = [];
  for (const [name, files] of [...refs.relations].sort()) {
    if (granted.has(name)) continue;
    const inCatalog = s.relation(name).ok;
    missing.push(
      `${name} — ${inCatalog ? "exists but is not granted" : "no such relation"}` +
        ` (${[...new Set(files)].join(", ")})`,
    );
  }
  assertEquals(
    missing,
    [],
    "The worker's SQL names relations that job_worker has no privilege on.\n" +
      "PostgREST and psql both fail the whole statement, so the job errors on " +
      "its first query rather than on the one that needed the grant.\n" +
      missing.map((m) => `  - ${m}`).join("\n"),
  );
});

Deno.test("worker grants: every function the worker's SQL calls is granted to it", () => {
  // This is the check that matters, and the one no amount of running the crate
  // against a test database can make: a superuser is exempt from privilege
  // checks, so a suite running as one sees a missing grant as a query that
  // works.
  //
  // It is also not a hypothetical. `20261001000000_automation_queue_claims.sql`
  // revokes EXECUTE from PUBLIC on the four claim and write-back functions and
  // then grants them to `service_role` — a Supabase role the Deno edge functions
  // use and the Rust worker does not. The Rust worker authenticates as
  // `job_worker_app` and `SET ROLE job_worker` on every physical connection, so
  // it runs as `job_worker`, which was never granted anything here. The
  // automation drip queue would fail with `permission denied` on its first
  // call — and so would `preview_automation_queue`, which is the shadow-mode
  // preview that `docs/rust-migration.md` § 6 step 2 depends on to compare the
  // two implementations before the cutover. The safety step is the thing that
  // is blocked.
  const missing: string[] = [];
  for (const [name, files] of [...refs.functions].sort()) {
    if (granted.has(name)) continue;
    const overloads = s.overloads(name);
    missing.push(
      `${name} — ${overloads.length ? "exists but is not granted" : "no such function"}` +
        ` (${[...new Set(files)].join(", ")})`,
    );
  }
  assertEquals(
    missing,
    [],
    "The worker calls functions that job_worker has no EXECUTE on.\n\n" +
      "A grant to `service_role` does not reach the worker: it authenticates as " +
      "`job_worker_app` and SET ROLEs to `job_worker`, which is NOINHERIT and " +
      "holds nothing of its own beyond what 20260927000000 gave it.\n" +
      missing.map((m) => `  - ${m}`).join("\n"),
  );
});

// =============================================================================
// The other direction
// =============================================================================

/**
 * Relations the worker reaches that are not written literally in its SQL.
 *
 * `Source::table()` in `translation.rs` returns the relation name as a
 * `match` arm and the query interpolates it, so `posts`, `challenges` and
 * `forum_posts` appear in no `FROM` clause and the scan above cannot see them.
 * That is a gap with teeth: a grant that the code needs and the audit cannot
 * check is a grant that can be missing without anything noticing, which is
 * exactly how `forum_posts` came to be ungranted.
 *
 * So they are declared here instead, and the declaration is checked in both
 * directions — each must be granted, and each must actually appear in the
 * crate — so the list cannot quietly become a place to hide a relation.
 */
const DYNAMIC_RELATIONS: Record<string, string> = {
  posts: "Source::Posts and Source::PostDescriptions",
  challenges: "Source::ChallengeTitles and Source::ChallengeDescriptions",
  forum: "Source::ForumPostTitles and Source::ForumPostContents",
};

/**
 * A dynamic relation the worker reaches and the catalog cannot serve.
 *
 * This used to hold `forum_posts`: no migration created the relation, so no
 * grant for it could be written, and the entry existed so the gap was visible
 * in the test output rather than absent from it. The decision recorded in
 * that entry was made: the worker's forum source is the real `forum` table
 * (the `Source::table()` arm moved there), and `20261108140000` grants it.
 * The list is now empty on purpose — the shape stays, so a new unresolvable
 * relation gets listed here instead of being silently dropped.
 */
const KNOWN_UNREACHABLE: Record<string, string> = {};

Deno.test("worker grants: nothing is granted to the worker that its SQL never names", () => {
  const unused: string[] = [];
  for (const name of [...granted.keys()].sort()) {
    if (refs.relations.has(name) || refs.functions.has(name)) continue;
    if (name in DYNAMIC_RELATIONS) continue;
    // Read inside a SECURITY INVOKER function the worker calls: the grant is
    // justified by a table the scan cannot see, and the INVOKER test below
    // checks that justification against the catalog rather than trusting it.
    if (invokerReads.has(name)) continue;
    unused.push(name);
  }
  assertEquals(
    unused,
    [],
    "The worker holds privileges on objects its SQL never names. A grant " +
      "nobody uses is a grant that widens the blast radius of a compromised " +
      "worker for nothing. Either the code stopped using it — revoke — or the " +
      "relation is chosen at runtime, in which case record why here.\n" +
      unused.map((u) => `  - ${u}`).join("\n"),
  );
});

Deno.test("worker grants: every relation the worker reaches by name has a grant", () => {
  // Including the three that only appear as a `match` arm. `forum_posts` is
  // reported and listed: no migration creates the relation, so the grant in
  // 20260927000000 is the statement that makes that file fail, and no amount of
  // re-granting reaches it.
  const gaps: string[] = [];
  for (const [name, why] of Object.entries(DYNAMIC_RELATIONS)) {
    if (granted.has(name)) continue;
    const known = KNOWN_UNREACHABLE[name];
    gaps.push(
      `${name} — ${known ?? "not granted"} (reached as ${why})`,
    );
  }
  assertEquals(
    gaps.filter((g) => !g.startsWith(Object.keys(KNOWN_UNREACHABLE)[0])),
    [],
    "A relation the worker reaches at runtime has no grant. It is invisible " +
      "to the scan above because its name is a match arm rather than a FROM " +
      "clause, which is how one of them went ungranted in the first place.\n" +
      gaps.map((g) => `  - ${g}`).join("\n"),
  );
  // And the *listed* gap stays listed, rather than the entry being deleted and
  // the omission becoming invisible.
  for (const [name, reason] of Object.entries(KNOWN_UNREACHABLE)) {
    assert(
      !granted.has(name),
      `${name} is now granted, so it no longer belongs in KNOWN_UNREACHABLE. ` +
        "Decide what that means — the relation exists now, or the grant is " +
        "covering a name with no table behind it — and update this file.\n" +
        "  recorded reason: " + reason,
    );
  }
});

Deno.test("worker grants: every function the role is granted on actually exists", () => {
  // The mirror of the call-side check, and the one that catches a rename.
  //
  // `granted` is keyed by name, so a function dropped from the schema while its
  // grant survives looks exactly like a function that is granted. This reads
  // the *object* in the grant and asks the catalog whether it is there, which
  // is the difference between a grant that works and a grant that reads well.
  const dangling: string[] = [];
  for (const g of s.catalog.grants) {
    if (!WORKER_ROLES.includes(g.grantee) || g.kind !== "function") continue;
    const name = g.object.replace(/\(.*\)$/, "");
    if (s.overloads(name).length === 0) {
      dangling.push(`${g.object} → ${g.grantee} (${g.privileges.join(",")})`);
    }
  }
  assertEquals(
    dangling,
    [],
    "The worker holds EXECUTE on functions that do not exist. A grant naming a " +
      "missing function is an error when written and a lie once written, and it " +
      "is indistinguishable from a working grant by name alone.\n" +
      dangling.map((d) => `  - ${d}`).join("\n"),
  );
});

// =============================================================================
// The RLS half
// =============================================================================
//
// The checks above answer "does the role hold the privilege?"; these answer
// "does the privilege mean anything at query time?" RLS is enabled on the
// worker's tables, and RLS is the second gate a grant has to get through.

Deno.test("worker grants: every RLS-enabled relation the worker touches has a job_worker policy", () => {
  // A grant is only half the surface. With RLS on and no `job_worker` policy,
  // the only policies in force for the worker's bare connection are the
  // `PUBLIC` ones, and they resolve one of two ways, neither of which is the
  // row the worker needs:
  //
  // * the qual is keyed on `auth.uid()`, which is NULL on a direct
  //   connection — the query succeeds and returns zero rows. The digest
  //   batch join finds no profiles and the job reports success while doing
  //   nothing, forever;
  // * the qual reads `public.user_roles` or calls `is_admin()`, which
  //   `job_worker` has no privilege on — the planner fails the whole
  //   statement before a row is considered, and the job errors on its first
  //   query.
  //
  // Neither shape is visible to the grant audit above (the grant is present)
  // or to the superuser integration suite (RLS does not apply to a
  // superuser). The estate's design — `20260927000000`: one explicit
  // `job_worker` policy per table, `USING (true)` — is what makes the worker's
  // rows visible, and it also constant-folds the `PUBLIC` admin quals out of
  // the plan, which is what removes the second shape rather than papering
  // over it. This asserts the design holds for every table the worker
  // touches, not just the four the first migration covered.
  const needed = new Set<string>([
    ...refs.relations.keys(),
    ...Object.keys(DYNAMIC_RELATIONS),
    ...invokerReads.keys(),
  ]);
  const uncovered: string[] = [];
  for (const name of [...needed].sort()) {
    const rel = s.relation(name);
    if (!rel.ok) continue; // a missing relation is reported by the grant tests
    if (!rel.value.rlsEnabled) continue;
    const policies = s.policies(name);
    const hasWorkerPolicy = policies.some((p) => p.roles.includes("job_worker"));
    if (!hasWorkerPolicy) {
      uncovered.push(
        `${name} — RLS enabled, policies: ${
          policies.length ? policies.map((p) => p.name).join(", ") : "none"
        }`,
      );
    }
  }
  assertEquals(
    uncovered,
    [],
    "The worker touches RLS-enabled relations with no job_worker policy. " +
      "With only the PUBLIC policies in force the worker sees either zero rows " +
      "or a plan-time permission error, and the job never knows the difference — " +
      "the superuser integration suite sees the row either way.\n" +
      uncovered.map((u) => `  - ${u}`).join("\n"),
  );
});

Deno.test("worker grants: every operation the worker's SQL performs is granted and permitted by policy", () => {
  // The checks above ask whether the role holds *some* privilege on a table
  // and whether *some* job_worker policy exists. A SELECT grant plus a
  // SELECT policy satisfies both while saying nothing about the operations
  // the SQL actually performs, and that is exactly how `device_tokens`
  // passed every check with a broken delete: SELECT-granted, SELECT-policed,
  // and `delete_device_tokens` (the digest job's cleanup of tokens a push
  // provider reported as permanently invalid) is a `DELETE`. The statement
  // is planned before any row is considered, so the missing DELETE grant
  // fails with `permission denied` even when zero tokens match — seen on a
  // real cluster, where this file reported green the whole time.
  //
  // The two failure shapes are the read half's two shapes, one level down:
  //
  // * no grant for the operation: `permission denied for table …`, the job
  //   errors on its first write-back;
  // * grant without a policy permitting the operation: RLS filters every
  //   row, the statement is a success that affects zero rows, and the
  //   invalid token is reported by the provider on the next pass, forever,
  //   while the job reports success.
  //
  // Both are invisible to the superuser integration suite, which is the
  // class of gap 20261108140000 and its audit extension exist to remove.
  const gaps: string[] = [];
  for (const [table, ops] of [...refs.operations].sort()) {
    const rel = s.relation(table);
    if (!rel.ok) continue; // a missing relation is reported by the grant tests
    const held = granted.get(table) ?? [];
    const policies = s.policies(table);
    for (const op of [...ops].sort()) {
      if (!held.includes(op)) {
        gaps.push(
          `${table} — the SQL performs ${op}, but job_worker holds no ${op} ` +
            `grant (holds: ${held.join(", ") || "nothing"})`,
        );
        continue;
      }
      if (!rel.value.rlsEnabled) continue;
      const permits = policies.some(
        (p) => p.roles.includes("job_worker") && (p.command === "ALL" || p.command === op),
      );
      if (!permits) {
        gaps.push(
          `${table} — granted ${op}, but no job_worker policy permits it ` +
            `(policies: ${
              policies.map((p) => `${p.name}:${p.command}`).join(", ") || "none"
            }); the statement will succeed and affect zero rows`,
        );
      }
    }
  }
  assertEquals(
    gaps,
    [],
    "The worker's SQL performs an operation job_worker is not granted, or a " +
      "policy does not permit. The first shape errors on the first write-back; " +
      "the second is a success that never touches a row, and only the provider " +
      "reports it, one duplicate at a time.\n" +
      gaps.map((g) => `  - ${g}`).join("\n"),
  );
});

Deno.test("worker grants: tables read inside SECURITY INVOKER functions the worker calls are granted", () => {
  // `EXECUTE` on a function does not reach the tables the function reads: a
  // `SECURITY INVOKER` body runs its queries as the caller, so the read needs
  // its own grant on top of the `EXECUTE`. `20261013000000` granted the five
  // automation functions to `job_worker` — including
  // `preview_automation_queue` — and stopped there. The preview's `SELECT`
  // runs as `job_worker` on `email_automation_queue`, which no migration
  // granted, so the shadow preview (`docs/rust-migration.md` § 6 step 2, the
  // comparison that gates the cutover) fails with `permission denied` on its
  // first run. The grant scan above cannot see the gap: the crate names the
  // function, not the table behind it.
  const missing: string[] = [];
  for (const [table, callers] of [...invokerReads].sort()) {
    if (granted.has(table)) continue;
    missing.push(`${table} — read by ${callers.join(", ")}() as its caller`);
  }
  assertEquals(
    missing,
    [],
    "A SECURITY INVOKER function the worker calls reads a table job_worker " +
      "has no grant on. EXECUTE covers the call, not the read behind it, so " +
      "the function succeeds into permission denied on its first query.\n" +
      missing.map((m) => `  - ${m}`).join("\n"),
  );
});

// =============================================================================
// The properties the role is supposed to have
// =============================================================================

Deno.test("worker grants: job_worker is neither a superuser nor a BYPASSRLS role", () => {
  // The migration's own verification block asserts this, and it is asserted here
  // too because a superuser is exempt from every check in this file: with a
  // superuser connection every missing grant above would look present, and the
  // audit would report success while proving nothing.
  const worker = s.role("job_worker");
  const login = s.role("job_worker_app");
  assert(worker && login, "a worker role is missing from the catalog");

  assertEquals(
    { superuser: worker.superuser, bypassRls: worker.bypassRls },
    { superuser: false, bypassRls: false },
    "job_worker must not be a superuser or carry BYPASSRLS. Both make every " +
      "grant check in this file vacuous, and the RLS policies in " +
      "20260927000000 exist precisely so the worker is not an invisible " +
      "BYPASSRLS role.",
  );
  assertEquals(
    { superuser: login.superuser, bypassRls: login.bypassRls },
    { superuser: false, bypassRls: false },
    "job_worker_app must not be either, for the same reason: it is the role " +
      "the worker actually authenticates as.",
  );
  assertEquals(
    login.memberOf,
    ["job_worker"],
    "job_worker_app must be a member of job_worker and nothing else. The " +
      "privileges arrive by SET ROLE, not by inheritance, because " +
      "job_worker_app is NOINHERIT.",
  );
});
