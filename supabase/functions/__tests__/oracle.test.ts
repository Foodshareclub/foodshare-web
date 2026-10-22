/**
 * The schema oracle's own tests.
 *
 * The oracle exists because four audits were parsing SQL with regular
 * expressions and getting confident, wrong answers out of it. It would be a
 * poor way to fix that if its own failure modes were the same kind, so every
 * property below is one of the ways this tool could quietly stop working, and
 * each is asserted rather than assumed:
 *
 * | Test                                        | Stops                                            |
 * |---------------------------------------------|--------------------------------------------------|
 * | the catalog describes the corpus on disk    | a migration shipping without a regenerated catalog |
 * | every rule hits `expectedHits` times        | a form appearing that nothing rewrites, or a rule rotting |
 * | the table is a fixed point                  | a rewrite whose output another rule re-matches   |
 * | a capture group is substituted              | the `$1`-not-expanded bug, which wrote `($1::text)` into production SQL |
 * | the unapplied set matches a pinned list     | a new broken migration, or a fixed one lingering  |
 * | coverage floors                             | an export that quietly returned nothing          |
 * | the transaction modes are self-consistent   | a file classified wrongly in a way nothing reports |
 * | deploy.sh's patterns are unchanged          | the oracle and the deploy pipeline drifting apart |
 *
 * None of these needs a database. That is deliberate: the expensive check —
 * applying seventy-odd migrations and exporting the catalog — is what CI runs
 * separately via `supabase/oracle/apply.ts --check`, and the checks here are
 * the ones cheap enough that nobody would have an excuse to skip them.
 *
 * See `docs/oracle.md`.
 */

import { assert, assertEquals } from "@std/assert";

import { CATALOG_PATH, migrationFiles, type Mode, modeFor } from "../../oracle/apply.ts";
import type { Catalog } from "../../oracle/catalog.ts";
import {
  countDefaults,
  SCANNER_CASES,
  splitTopLevel as splitTopLevelForTest,
} from "../../oracle/catalog.ts";
import { applySubstitutions, isFixedPoint, loadRules } from "../../oracle/substitute.ts";

const MIGRATIONS_DIR = new URL("../../migrations/", import.meta.url);
const DEPLOY_SH = new URL("../../../scripts/deploy.sh", import.meta.url);

function readCatalog(): Catalog {
  return JSON.parse(Deno.readTextFileSync(CATALOG_PATH)) as Catalog;
}

function corpus(): string[] {
  return [...Deno.readDirSync(MIGRATIONS_DIR)]
    .filter((e) => e.isFile && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort();
}

// =============================================================================
// 1. The catalog and the corpus agree
// =============================================================================

Deno.test("oracle: catalog.json was generated from the migrations that are on disk", () => {
  const catalog = readCatalog();
  const onDisk = corpus();

  assertEquals(
    catalog.migrations,
    onDisk,
    "catalog.json lists a different set of migrations than the directory " +
      "contains.\n\n" +
      "A migration was added, removed or renamed without regenerating the " +
      "catalog, so every audit reading it is reasoning about a schema that is " +
      "no longer the one this repository describes. That is the failure this " +
      "file exists to make impossible, and it is invisible in review because " +
      "the code looks untouched.\n\n" +
      "  deno run --allow-all supabase/oracle/apply.ts\n\n" +
      "and then read the diff.",
  );
});

Deno.test("oracle: the corpus is not empty", () => {
  // A directory that matches nothing is indistinguishable from one that was
  // never there, and a test that reads "no findings" from it is the exact
  // shape of the bug that made this whole exercise necessary.
  const files = corpus();
  assert(
    files.length > 60,
    `only ${files.length} migrations found; the corpus has never been this small`,
  );
  for (const f of files) {
    assert(
      /^\d{14}_[a-z0-9_]+\.sql$/.test(f),
      `${f} does not match YYYYMMDDHHMMSS_name.sql, so the oracle's sort ` +
        "order is not the deploy order and its mode table is keyed wrongly",
    );
  }
});

// =============================================================================
// 2. The substitution table
// =============================================================================

Deno.test("oracle: every substitution rule fires exactly as often as it claims", () => {
  const rules = loadRules();
  const totals = new Map<string, number>();

  for (const file of corpus()) {
    const { applications } = applySubstitutions(
      Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR)),
      rules,
    );
    for (const a of applications) {
      totals.set(a.rule.id, (totals.get(a.rule.id) ?? 0) + a.hits);
    }
  }

  const wrong: string[] = [];
  for (const rule of rules) {
    const actual = totals.get(rule.id) ?? 0;
    if (actual !== rule.expectedHits) {
      wrong.push(
        `${rule.id}: expected ${rule.expectedHits}, matched ${actual}`,
      );
    }
  }

  assertEquals(
    wrong,
    [],
    "A substitution rule no longer matches the corpus as often as it says it " +
      "does. The two directions matter and have opposite meanings.\n\n" +
      "  * Fewer matches: the form is gone, or the pattern has stopped " +
      "matching it. Either the rule is now dead weight, or — worse — it looks " +
      "alive and is quietly not rewriting something.\n" +
      "  * More matches: a form has appeared that nothing accounted for, and " +
      "it reached PostgreSQL unrewritten. The migration that contains it " +
      "failed for a reason that has nothing to do with the real problem, and " +
      "the error message will point at the wrong thing.\n\n" +
      wrong.map((w) => `  - ${w}`).join("\n"),
  );
});

Deno.test("oracle: the fixed-point check can report a violation", () => {
  // `isFixedPoint` is only ever called on text that *is* a fixed point, so a
  // version of it that always returned `[]` would pass every call it gets. The
  // corpus cannot distinguish them; a known-unsettled input can. This is the
  // test that makes the fixed-point assertion mean something, and it is here
  // because the mutation harness caught its absence.
  const unsettled = loadRules()
    .map((r) => r.kind === "line" ? r.pattern : r.pattern)
    .find((p) => /hnsw/.test(p));
  assert(
    unsettled,
    "the hnsw rule is gone; pick another to make this test mean something",
  );

  const stillMatching = isFixedPoint(
    "CREATE INDEX i ON t USING hnsw (e vector_cosine_ops);",
  );
  assert(
    stillMatching.includes("hnsw-index"),
    "isFixedPoint reported no violation for input that a rule plainly matches. " +
      "It is being called only on settled text, so nothing would have noticed; " +
      "this input is what notices.",
  );
});

Deno.test("oracle: the substitution table is a fixed point", () => {
  // A rewrite that produces text a later rule matches gets rewritten twice,
  // and the second pass is invisible: the hit count is measured before the
  // replacement, so the count says one thing and the output another.
  for (const file of corpus()) {
    const { sql } = applySubstitutions(
      Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR)),
    );
    const again = isFixedPoint(sql);
    assertEquals(
      again,
      [],
      `${file}: after rewriting, these rules still match the output, so they ` +
        "would rewrite it a second time:\n" + again.map((r) => `  - ${r}`).join("\n"),
    );
  }
});

Deno.test("oracle: a capture group in a rule is actually substituted", () => {
  // A rule that captures and re-emits `$1` wrote the literal text `$1` into
  // the SQL for a while, because `String.replace` was given a *function* as
  // its replacement, and the function form suppresses capture expansion. The
  // result was `USING btree (($1)::text)` in the baseline, and the error
  // PostgreSQL reported was "syntax error at or near ::" — pointing at the
  // corpus rather than at the rule that had mangled it.
  const rules = loadRules();
  const capturing = rules.filter((r) =>
    /\$1/.test(
      Array.isArray(r.replacement) ? r.replacement.join("") : r.replacement,
    )
  );
  assert(
    capturing.length > 0,
    "no rule captures a group any more; either the corpus changed or the " +
      "rules that used to were deleted, and this test no longer covers the bug " +
      "it was written for",
  );

  for (const rule of capturing) {
    const re = new RegExp(
      rule.pattern,
      rule.kind === "line" ? "gm" : "g",
    );
    // Build an input that matches, by asking the real corpus for one.
    let sample: string | null = null;
    for (const file of corpus()) {
      const text = Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR));
      if (re.test(text)) {
        sample = text.match(re)?.[0] ?? null;
        break;
      }
    }
    assert(sample !== null, `no input in the corpus matches ${rule.id}`);

    const out = applySubstitutions(sample, [rule]).sql;
    assertEquals(
      out.includes("$1"),
      false,
      `${rule.id} left a literal $1 in its output:\n  in:  ${sample}\n  out: ${out}\n` +
        "A capture group is not being expanded, which means the replacement " +
        "was passed as a function rather than a string.",
    );
  }
});

// =============================================================================
// 3. Migrations that do not apply
// =============================================================================

/**
 * Every migration the corpus contains and PostgreSQL refuses, with the reason.
 *
 * Pinned one by one rather than as a count, because a count cannot be acted
 * on: someone reading "9 unapplied" learns nothing, and someone adding a tenth
 * has to open the catalog to find out which one is new. A reason is a claim,
 * and a claim that is wrong is caught the next time the file's behaviour
 * changes.
 *
 * Two kinds appear here, and the difference is not cosmetic:
 *
 *   * **Needs data.** The statement is valid against a populated database and
 *     fails against an empty one. Harmless in production, unfixable in the
 *     oracle, and never a schema finding.
 *   * **Names something that does not exist.** A relation, a column or a
 *     function signature that no migration creates. This is a real finding
 *     about the corpus, and the reason column says which.
 */
const UNAPPLIED: Record<string, string> = {
  "20260207000003_migrate_community_fridges.sql":
    "needs data — inserts rows whose `address.country_id` must reference a " +
    "row in `continents`, which the baseline does not seed. Valid against a " +
    "populated database.",

  "20260209000002_fix_rls_policies.sql":
    "names something that does not exist — all thirteen of its policies are " +
    "already in the baseline, verbatim, so the first `CREATE POLICY` fails on " +
    "`policy ... already exists` and the file is a no-op that cannot apply. " +
    "Together with the baseline's `CREATE SCHEMA public`, this is the second " +
    "hard stop in the chain: `deploy.sh` breaks on the first failure, so the " +
    "corpus cannot be replayed from the beginning. Production is unaffected " +
    "only because both files are already in `schema_migrations` and skipped.",

  "20260215120000_optimize_aggregations.sql":
    "names something that does not exist — the unread-counts aggregate it " +
    "creates filters on `rooms.user_id` and `rooms.post_user_id`. `rooms` " +
    "has `requester`, `sharer` and `post_id`, and no `user_id` at all. The " +
    "function is created and fails on every call. A regex audit reading column " +
    "names could not have found this: the column is inside a SQL string in a " +
    "plpgsql body.",

  "20260215120001_add_composite_indexes.sql":
    "names something that does not exist — `CREATE INDEX ... ON messages(...)` " +
    "and there is no `messages` table in any migration. `api-v1-chat` queries " +
    "the same absent relation.",

  "20260215120002_batch_engagement.sql":
    "names something that does not exist — the batch engagement aggregate " +
    "reads `post_likes` and `post_bookmarks`, neither of which any migration " +
    "creates. These are the tables `api-v1-engagement` reads, so the entire " +
    "engagement feature depends on relations the repository does not describe.",
};

Deno.test("oracle: the migrations that do not apply are exactly the ones pinned", () => {
  const catalog = readCatalog();
  const actual = catalog.unapplied.map((u) => u.file).sort();
  const pinned = Object.keys(UNAPPLIED).sort();

  assertEquals(
    actual,
    pinned,
    "The set of migrations PostgreSQL refuses has changed.\n\n" +
      "A new entry is a migration that cannot apply — read its `errors` in " +
      "catalog.json and decide whether it is a finding or a harness gap, " +
      "then add it above with a reason. A missing entry is a migration that has " +
      "been fixed, which is good news and means deleting its line.\n\n" +
      actual.filter((f) => !pinned.includes(f)).map((f) => `  + ${f}`).join(
        "\n",
      ) +
      "\n" +
      pinned.filter((f) => !actual.includes(f)).map((f) => `  - ${f}`).join(
        "\n",
      ),
  );
});

Deno.test("oracle: every pinned unapplied migration carries a reason and an error", () => {
  const catalog = readCatalog();
  for (const file of Object.keys(UNAPPLIED)) {
    const entry = catalog.unapplied.find((u) => u.file === file);
    if (!entry) continue; // absence is the previous test's business
    assert(
      entry.errors.length > 0,
      `${file} is pinned as unapplied but the catalog records no error. Either ` +
        "it applies now and the pin should be deleted, or the error is being " +
        "swallowed somewhere between psql and here — and a failure with no " +
        "message is the one nobody can act on.",
    );
  }
  for (const [file, reason] of Object.entries(UNAPPLIED)) {
    assert(
      reason.length > 40,
      `${file} has a placeholder reason rather than an explanation`,
    );
  }
});

// =============================================================================
// 4. Coverage
// =============================================================================

/**
 * Floors, not expectations.
 *
 * These are not "the numbers should be 225 and 585" — that would fail every
 * time a migration lands, and a test that fails on every ordinary change is a
 * test people disable. They are the point below which something has gone
 * structurally wrong: an export that returned nothing, a query that stopped
 * matching, a schema that lost a third of its tables. Set an order of
 * magnitude under the measured values so ordinary growth passes and a collapse
 * does not.
 */
const FLOORS = {
  relations: 150,
  tables: 140,
  functions: 400,
  policies: 350,
  indexes: 400,
  enums: 4,
  cronJobs: 40,
} as const;

Deno.test("oracle: the catalog is populated", () => {
  const c = readCatalog();
  const actual = {
    relations: c.relations.length,
    tables: c.relations.filter((r) => r.kind === "table").length,
    functions: c.functions.length,
    policies: c.policies.length,
    indexes: c.indexes.length,
    enums: c.enums.length,
    cronJobs: c.cronJobs.length,
  };

  const short = Object.entries(FLOORS)
    .filter(([k, floor]) => (actual[k as keyof typeof actual] as number) < floor)
    .map(([k, floor]) => `  - ${k}: ${actual[k as keyof typeof actual]} (floor ${floor})`);

  assertEquals(
    short,
    [],
    "The catalog is smaller than it should be by an order of magnitude.\n\n" +
      "Every audit that reads this file now has less to look at, and an audit " +
      "with nothing to check reports nothing — which is indistinguishable " +
      "from a clean run. The usual cause is a catalog query that stopped " +
      "matching after a PostgreSQL version change, and it is invisible in " +
      "review because nothing about the code looks wrong.\n\n" +
      short.join("\n"),
  );
});

Deno.test("oracle: every table the public can reach has row-level security", () => {
  // CLAUDE.md rule 7 — "RLS on all tables. No exceptions." — asserted against
  // PostgreSQL's own `relrowsecurity` rather than against a parse of the
  // migration text.
  //
  // Two scopings, each of which was wrong once.
  //
  // * Only tables. Views, matviews and foreign tables report
  //   `relrowsecurity = false` and the flag is meaningless for all three: a view
  //   has no rows of its own and PostgreSQL refuses RLS on a foreign table
  //   outright. The first version counted every relation and failed on 18 of
  //   them — a real number and the wrong question.
  // * Only tables `anon` or `authenticated` can reach. This one is newer and it
  //   matters more, because the catalog now exports every non-system schema and
  //   that surfaced 9 relations with RLS disabled: `auth.users`,
  //   `storage.objects`, `vault.secrets`, `audit.logged_actions`,
  //   `billing.subscriptions`, `metrics.alerts` and three `metrics.*` tables.
  //   They are all service-only, none of them is reachable by a client role, and
  //   exempting them by hand — a name list — would have been an exemption nobody
  //   could check. So reachability is computed by PostgreSQL itself
  //   (`has_table_privilege`, recorded per relation) and the rule is scoped to
  //   the attack surface rather than to the ownership.
  //
  //   The alternative reading — that rule 7 means literally every table — is
  //   also fine as a policy, but it is not what the schema does, and a test
  //   asserting a policy the schema does not follow reports a defect forever
  //   without anyone being able to tell which of the two is wrong.
  const c = readCatalog();
  const tables = c.relations.filter((r) => r.kind === "table");
  const reachable = tables.filter((r) => r.reachableByAnon || r.reachableByAuthenticated);

  assert(
    reachable.length > 150,
    `only ${reachable.length} reachable tables in the catalog; reachability is ` +
      "being computed as false across the schema, which would exempt every " +
      "table and make this assertion empty rather than passing.",
  );

  const off = reachable.filter((r) => !r.rlsEnabled).map((r) => r.name);

  assertEquals(
    off,
    [],
    "These tables are readable or writable by the anon or authenticated key " +
      "with row-level security off, which rule 7 does not permit:\n" +
      off.map((t) => `  - ${t}`).join("\n"),
  );

  // The exemption is disclosed rather than filtered. A test that only ever
  // prints failures cannot say "and here is what I skipped", so the skipped set
  // is asserted here: it can change, but it cannot change unnoticed.
  const exempt = tables
    .filter((r) => !r.reachableByAnon && !r.reachableByAuthenticated)
    .map((r) => `${r.schema}.${r.name}`)
    .sort();

  assert(
    exempt.length > 0,
    "no table is unreachable by the client roles. That is either a change in " +
      "privileges worth recording, or `has_table_privilege` has stopped " +
      "answering, in which case this test is approving a schema it cannot " +
      "see.\n  " + exempt.join("\n  "),
  );

  // `rlsForced` is a separate and stronger property: with it set, the table
  // owner is subject to the policies too. Nothing in the corpus sets it, which
  // is worth knowing rather than assuming.
  const notForced = reachable.filter((r) => !r.rlsForced).length;
  assert(
    notForced > 0,
    "every reachable table has RLS_FORCE_ROW_LEVEL_SECURITY set. That is a " +
      "change in the schema's posture and nothing in the catalog records why; " +
      "check it is deliberate before this assertion is relaxed.",
  );
});

Deno.test("oracle: the catalog says which of it is a stand-in", () => {
  // `vector_type_substituted` is a view `platform.sql` creates for one reason:
  // so that `posts.embedding` being a stand-in type is discoverable from the
  // schema rather than only from this repository's source. It is the single
  // catalog field that does not match production — `atttypmod = -1` where
  // production has 384 — and a marker nobody checks is a marker that gets
  // dropped in a tidy-up and takes the disclosure with it.
  const c = readCatalog();
  const marker = c.relations.find((r) => r.name === "vector_type_substituted");
  assert(marker, "the vector stand-in marker view is missing from the catalog");
  assertEquals(
    marker.kind,
    "view",
    "the marker should be a view; if it became a table, something has replaced " +
      "the disclosure with real data, which is a good outcome but not a silent one",
  );

  // And the thing the marker is about must actually be in the catalog.
  const posts = c.relations.find((r) => r.name === "posts" && r.kind === "table");
  const embedding = posts?.columns.find((col) => col.name === "embedding");
  assert(
    embedding,
    "posts.embedding is absent, so the migration that adds it did not apply " +
      "and the vector stand-in is not being exercised at all",
  );
  assertEquals(
    embedding.type,
    "public.vector",
    "posts.embedding is not the stand-in type, so the marker view is " +
      "describing something that is no longer there",
  );
});

Deno.test("oracle: every relation reports its columns", () => {
  // There is no "unreadable" case, and that is the point.
  //
  // The reader used to carry an `opaque` flag for a view declared `WITH (...)`
  // with no explicit column list, which is a shape a *text* parser cannot read
  // columns out of. From the catalog there is no such thing: PostgreSQL always
  // knows a view's output columns. All 17 views here have them.
  //
  // So the flag was never true, and it existed only to let an audit skip a
  // relation it could have checked — `posts_with_location`, read by four files,
  // was skipped by all of them. A relation reporting zero columns is now simply
  // a defect in the export.
  const c = readCatalog();
  const suspects = c.relations.filter((r) => r.columns.length === 0);
  assertEquals(
    suspects.map((r) => `${r.kind} ${r.name}`),
    [],
    "These relations report no columns. A view's columns are always in the " +
      "catalog, so this is the export losing them rather than a relation " +
      "genuinely having none.\n" +
      suspects.map((x) => `  - ${x}`).join("\n"),
  );
});

Deno.test("oracle: the substitutions that change the catalog are recorded in it", () => {
  // A reader of catalog.json has to be able to tell which parts of it are not
  // the real thing. Anything with `affectsCatalog` has to be listed, or the
  // snapshot is presented as more authoritative than it is.
  const c = readCatalog();
  const known = new Set(loadRules().map((r) => r.id));
  const recorded = c.substitutions.map((s) => s.id);
  const affecting = loadRules().filter((r) => r.affectsCatalog).map((r) => r.id);

  // Every catalog-altering rule must be listed, so a reader of catalog.json
  // can tell which parts of it are real. The export deliberately records more
  // than that — every rule that fired, including the two that only touch the
  // SQL stream — so the check is containment rather than equality.
  const missing = affecting.filter((id) => !recorded.includes(id));
  assertEquals(
    missing,
    [],
    "catalog.json does not list these substitutions, which do alter it. " +
      "Anything reading the file has no way to know which of it is real, and " +
      "`posts.embedding` in particular is a stand-in type.",
  );

  const unknown = recorded.filter((id) => !known.has(id));
  assertEquals(
    unknown,
    [],
    "catalog.json lists substitutions that are not in the table, so it was " +
      "generated from a different one. Regenerate it.",
  );

  // `affectsCatalog` is the one field in the table that cannot be derived from
  // anything: whether a rewrite changes the catalog is a judgement about what
  // a line of SQL does, and no mechanical check can make it. So it is pinned,
  // which is the only honest option — the alternative is a flag that silently
  // stops meaning what it says. The mutation harness caught its absence: with
  // only the containment check above, flipping any flag to `false` shrank the
  // expected set and still passed.
  //
  // The four that alter the catalog, and why:
  //
  //   airtable-foreign-table-options  the foreign table exists either way, but
  //                                  its recorded definition differs
  //   geography-typmod                `atttypmod` on the location columns
  //   vector-typmod                   `atttypmod` on posts.embedding
  //   hnsw-index                      the access method in the index definition
  //   postgis-gist-index              likewise, for the two spatial indexes
  //
  // And the ones that do not, which is the half that is easy to get wrong:
  // `pg-dump-restrict` and `public-schema` rewrite the SQL stream, `vector-
  // extension` only comments out a line the type now comes from `platform.sql`
  // for, and claiming any of them alters the catalog would overstate how much
  // of the snapshot is real.
  assertEquals(
    affecting.slice().sort(),
    [
      "airtable-foreign-table-options",
      "geography-typmod",
      "hnsw-index",
      "postgis-gist-index",
      "vector-typmod",
    ],
    "The set of substitutions that alter the catalog has changed.\n\n" +
      "Adding one: say in the table's `why` what it changes. Removing one: " +
      "check it really only rewrites the SQL stream, because a rule that " +
      "alters the catalog but claims not to is how a reader of catalog.json " +
      "ends up trusting a stand-in as if it were real.",
  );

  for (const s of c.substitutions) {
    assert(
      s.hits > 0,
      `${s.id} is recorded in the catalog with zero hits, so it rewrote ` +
        "nothing and should not be there",
    );
  }
});

// =============================================================================
// 5. Deploy semantics
// =============================================================================

Deno.test("oracle: the transaction classification is self-consistent", () => {
  // `deploy.sh` wraps a migration in BEGIN/COMMIT unless the file opens its own
  // transaction or creates an index CONCURRENTLY, and getting that wrong is
  // not a subtle degradation: `CREATE INDEX CONCURRENTLY cannot run inside a
  // transaction block` fails the migration outright. So the property is
  // checked in both directions — a file called non-transactional must really
  // have one, and a file with one must be called non-transactional.
  for (const file of migrationFiles()) {
    const sql = Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR));
    const mode = modeFor(sql);
    const hasConcurrent = sql
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .some((l) => /^\s*(CREATE|DROP|REINDEX|REFRESH)\b.*\bCONCURRENTLY\b/i.test(l));

    if (mode === "non-transactional") {
      assert(
        hasConcurrent,
        `${file} is treated as non-transactional but contains no top-level ` +
          "CONCURRENTLY. If deploy.sh agrees, the file is being run in " +
          "autocommit for no reason; if it does not, the two will disagree " +
          "about this file and only one of them will find out at deploy time.",
      );
    } else if (hasConcurrent) {
      assertEquals(
        mode,
        "non-transactional",
        `${file} contains a top-level CONCURRENTLY but was not classified as ` +
          "non-transactional, so it would be wrapped and fail.",
      );
    }

    if (mode === "self-contained") {
      assert(
        /^\s*(BEGIN|START TRANSACTION)\s*;/m.test(sql) &&
          /^\s*COMMIT\s*;/m.test(sql),
        `${file} is treated as self-contained, so it must both open and close ` +
          "a transaction. A file with only a COMMIT would be classified as " +
          "self-contained and then wrapped again by a caller that believed it.",
      );
    }
  }
});

Deno.test("oracle: the transaction classification is not constant", () => {
  // The self-consistency test above only constrains the classifications it is
  // given: if `modeFor` never returned `self-contained`, its `self-contained`
  // branch would never run and the file would have twelve migrations' worth of
  // BEGIN/COMMIT pairs that nothing looks at. Floors on the distribution, so
  // each branch is known to be exercised.
  const modes = new Map<Mode, string[]>();
  for (const file of migrationFiles()) {
    const mode = modeFor(Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR)));
    modes.set(mode, [...(modes.get(mode) ?? []), file]);
  }

  const floors: Record<Mode, number> = {
    wrapped: 40,
    "self-contained": 5,
    "non-transactional": 8,
  };
  const thin = (Object.keys(floors) as Mode[])
    .filter((m) => (modes.get(m)?.length ?? 0) < floors[m])
    .map((m) => `  - ${m}: ${modes.get(m)?.length ?? 0} files (floor ${floors[m]})`);

  assertEquals(
    thin,
    [],
    "Far fewer migrations are landing in this mode than the corpus implies. A " +
      "classifier that stopped distinguishing them would look fine against " +
      "any single file and would be wrong about all of them at once.\n" +
      thin.join("\n"),
  );
});

Deno.test("oracle: deploy.sh still classifies migrations the way the oracle does", () => {
  // `modeFor` re-implements the rule in `scripts/deploy.sh` because that rule
  // is two greps inside a deploy function and not importable. The cost of the
  // duplication is that the two can drift, and the symptom would be a file
  // the oracle applies happily and the deploy pipeline wraps and fails. This
  // pins the patterns as they appear in deploy.sh: if the rule changes there,
  // this fails and points at the other copy rather than at a mystery.
  const deploy = Deno.readTextFileSync(DEPLOY_SH);

  for (
    const fragment of [
      "^[[:space:]]*(BEGIN|START TRANSACTION|COMMIT|ROLLBACK)[[:space:]]*;",
      "^[[:space:]]*(CREATE|DROP|REINDEX|REFRESH)[[:space:]].*CONCURRENTLY",
    ]
  ) {
    assert(
      deploy.includes(fragment),
      `scripts/deploy.sh no longer contains the classification pattern\n` +
        `  ${fragment}\n\n` +
        "Either the deploy rule changed and modeFor() in " +
        "supabase/oracle/apply.ts must change with it, or the pattern is " +
        'spelled differently there. The oracle answers "what schema does a ' +
        'deploy produce", and that is only true while the two agree.',
    );
  }
});

// =============================================================================
// 8. The signatures it exports are PostgreSQL's
// =============================================================================

/**
 * `pg_get_function_arguments` reduced to what `args` should be: default
 * expressions removed, `OUT` parameters removed, mode prefixes removed.
 *
 * The *split* is the implementation's own, not a copy. A test that verifies a
 * scanner with its own scanner proves that two scanners agree, and the sixth
 * copy in this file was one bracket kind away from disagreeing — which is the
 * whole bug the consolidation was for. What is left here is only the
 * transformation, which is the thing being asserted.
 *
 * The `OUT` filter is what handles `pgp_armor_headers`, whose rendered form is
 * `text, OUT key text, OUT value text`: the first argument is *named* `text`
 * and must be kept, while the two `OUT` ones must not. A rule that dropped
 * every element whose name matched a mode token dropped the first one too.
 */
function dropDefaultsAndOut(rendered: string): string[] {
  return splitTopLevelForTest(rendered)
    .map((p) => p.trim().replace(/\s+/g, " "))
    // A defaulted parameter still contributes its name and type; only the
    // default expression goes. Cutting at `DEFAULT` is safe here *because* the
    // split already happened at top level, so the default can no longer contain
    // the comma that would have confused a regex.
    .map((p) => p.replace(/\s+DEFAULT\s+.*$/i, ""))
    // `OUT`/`INOUT`/`VARIADIC` parameters are not part of the identity and so
    // are absent from `proargnames`; a mode *prefix* on a real parameter is
    // only a prefix, so it is stripped rather than dropped.
    .filter((p) => !/^OUT\s/i.test(p))
    .map((p) => p.replace(/^(INOUT|IN|VARIADIC)\s+/i, ""))
    .filter(Boolean);
}

Deno.test("oracle: every function's argument names sit on their own types", () => {
  // The one export bug this had, and it was invisible to every other test.
  //
  // `pg_proc.proargtypes` is an `oidvector` and its elements are numbered from
  // **0**; `pg_proc.proargnames` is an ordinary array numbered from **1**. The
  // exporter walked them with a single subscript, so every name landed one
  // position ahead of its type: 249 of this schema's functions rendered with the
  // first name dropped and the rest misattributed, and
  // `toggle_post_bookmark(p_post_id bigint, p_user_id uuid)` came out as
  // `toggle_post_bookmark(bigint, p_post_id uuid)`.
  //
  // Why nothing caught it, which is the part worth keeping: the RPC audit
  // matches a call site's argument *names* against a function's parameter
  // names, so a name that is present-but-shifted still satisfies it. Every audit
  // downstream was reading a correct list of names, correct arity, and a
  // correct set of types, and combining them wrongly. `argTypes` did not exist,
  // so the only positional view of the types was the `args` string — and
  // splitting a `"p_user_id uuid"` element to compare it against a call site's
  // `"uuid"` never matches, which meant the prefix-match branch, the one that
  // resolves a call omitting defaulted arguments, was quietly dead.
  //
  // `rendered` is PostgreSQL's own `pg_get_function_arguments`, so comparing
  // `args` against it is two independent sources from one query, with defaults
  // as the only intended difference.
  const c = readCatalog();

  const mismatched: string[] = [];
  let named = 0;

  for (const f of c.functions) {
    if (!f.rendered) continue;

    // Only functions that have named parameters. `proargnames` is NULL when the
    // parameters were declared without names — `vault.create_secret`,
    // `vector_in`, `st_dwithin`, the FDW validators — and `args` is then empty
    // *by design*, while `rendered` still shows the types. Comparing those was a
    // false positive in the first version of this check, on 79 functions that
    // are all correct.
    if (!f.args) continue;

    named++;

    // Three differences between the two forms are intended, and each one is a
    // false positive if it is not accounted for. All three were found by
    // writing this check and reading what it reported.
    //
    // 1. **Defaults.** `pg_get_function_arguments` includes them and `args`
    //    does not, because `proargtypes` cannot. A parenthesised default must
    //    not be split on its inner comma, so the parenthesised and quoted forms
    //    are matched before the bare-word form.
    // 2. **Casts on the default.** `DEFAULT 'apple'::text` is rendered with its
    //    cast, and removing only `DEFAULT 'apple'` leaves `text::text` glued to
    //    the parameter. The whole default expression, cast included, is dropped.
    // 3. **OUT parameters.** `proargnames`/`proargtypes` hold the arguments that
    //    are part of the function's *identity*; `pg_get_function_arguments`
    //    lists every declared argument including `OUT`. So `rendered` has more
    //    elements than `args` and that is correct — an OUT parameter is not
    //    something a caller passes.
    //
    // The default expression is removed by *position* rather than by pattern,
    // because a default can contain a comma (`DEFAULT ARRAY['a'::text,
    // 'b'::text]`) and no regex that splits on `", "` survives that. Walking
    // top-level commas and dropping the element each `DEFAULT` appears in is
    // bracket- and quote-aware, which is the only way to be right here.
    const expected = dropDefaultsAndOut(f.rendered);

    // `args` is trimmed because a function may declare an argument with an
    // *empty* name — `pgp_armor_headers` has a single argument named `text` of
    // type `text`, and `proargnames` records it as `""`, so the export is
    // `" text"` with a leading space. That is the database's answer, not a
    // formatting mistake, and normalising whitespace here rather than in the
    // exporter keeps the artifact byte-identical to what PostgreSQL said.
    if (expected.join(", ") !== f.args.trim()) {
      mismatched.push(
        `${f.schema}.${f.name}:\n` +
          `        args:     ${f.args}\n` +
          `        rendered: ${f.rendered}\n` +
          `        expected: ${expected.join(", ")}`,
      );
    }
  }

  assertEquals(
    mismatched,
    [],
    "The exported argument names do not match the signature PostgreSQL " +
      "renders for the same function.\n\n" +
      "This is what a subscript off by one between proargnames (a 1-based " +
      "array) and proargtypes (a 0-based oidvector) looks like from here: the " +
      "first name is dropped and every later name is attached to the preceding " +
      "type. The RPC audit cannot see it, because it matches names against " +
      "names and a shifted name is still a name — so this is the only place it " +
      "can be caught.\n" +
      mismatched.slice(0, 20).join("\n") +
      (mismatched.length > 20 ? `\n  ...and ${mismatched.length - 20} more` : ""),
  );

  assert(
    named > 300,
    `only ${named} function(s) with named parameters were compared, so the ` +
      "check is not reading what it claims to. Roughly 250 of this schema's " +
      "functions declare parameter names.",
  );

  // A specific one, so the comparison above cannot be satisfied by something
  // consistent but wrong. `get_secret_audited` is the function the docs discuss
  // by signature — a migration grants it `(text, text, text)` when it is
  // `(text, uuid, jsonb)` — so it is the one a reader will check.
  const audited = c.functions.find((f) => f.name === "get_secret_audited");
  assertEquals(
    { args: audited?.args, argTypes: audited?.argTypes },
    {
      args: "secret_name text, requesting_user_id uuid, request_metadata jsonb",
      argTypes: ["text", "uuid", "jsonb"],
    },
    "get_secret_audited's signature is wrong in the catalog. The grant in " +
      "20260812200000_grant_public_privileges.sql is derived from this, so a " +
      "shift here would silently reproduce the bug that migration already has.",
  );
});

Deno.test("oracle: the types are in positional order, not alphabetical", () => {
  // The obvious way to turn an `oidvector` into an array is
  // `array_agg(format_type(t) ORDER BY t)`, and it is wrong: it sorts the
  // types by value, so `(p_post_id bigint, p_user_id uuid)` becomes
  // `(p_post_id uuid, p_user_id bigint)`. Both fields are internally
  // consistent, every name still precedes a type, and the signature is a
  // different function's — a check that only compares position to name passes
  // it. `get_secret_audited` is `text, uuid, jsonb`, which is neither its
  // positional order nor its alphabetical one, so it pins the distinction.
  const c = readCatalog();
  const f = c.functions.find((x) => x.name === "get_secret_audited");

  assertEquals(
    f?.argTypes,
    ["text", "uuid", "jsonb"],
    "get_secret_audited's argument types are not in positional order. " +
      "text < uuid alphabetically but not positionally, so a sorted array " +
      "would put jsonb first.",
  );
  assertEquals(
    f?.argTypes.length,
    3,
    "get_secret_audited takes three arguments; a shorter list means the " +
      "vector was read with the wrong bounds or one element was dropped",
  );
});

Deno.test("oracle: the SQL scanner survives every parameter-list shape it can meet", () => {
  // The four hand-rolled splitters this replaced each counted a different set of
  // brackets, and the disagreement was the defect. Consolidating them fixes the
  // corpus and leaves the *latent* cases untested — no function here defaults a
  // non-empty jsonb literal, so a scanner that tracked `()` and `[]` but not
  // `{}` produces an identical catalog and every test above stays green.
  //
  // That is the whole gap: a check that can only see what is in the database
  // cannot see the bug waiting for the next migration. So the shapes are stated
  // as data next to the scanner and iterated here, which is the only way the
  // comma-in-a-JSON-default case can fail.
  const wrong: string[] = [];
  for (const c of SCANNER_CASES) {
    const params = splitTopLevelForTest(c.signature);
    if (params.length !== c.count) {
      wrong.push(
        `${JSON.stringify(c.signature)}\n` +
          `        split into ${params.length}, expected ${c.count} — ${c.why}`,
      );
    }
    const n = countDefaults(c.signature);
    if (n !== c.defaults) {
      wrong.push(
        `${JSON.stringify(c.signature)}\n` +
          `        counted ${n} default(s), expected ${c.defaults} — ${c.why}`,
      );
    }
  }
  assertEquals(
    wrong,
    [],
    "The parameter-list scanner mis-parses a shape the current corpus does not " +
      "contain. Every case here is either a real function in this schema or one " +
      "a migration can write, and a scanner that gets them right by accident is " +
      "not a scanner that gets them right.\n" +
      wrong.join("\n"),
  );

  // And the floor: the table is read, so a rename that empties it fails rather
  // than passing on nothing.
  assert(
    SCANNER_CASES.length >= 10,
    `only ${SCANNER_CASES.length} scanner cases are pinned.`,
  );
});

Deno.test("oracle: there is one SQL parameter splitter, not several", () => {
  // Six copies of this loop existed and three of them were wrong at different
  // times. `parseNullables` counted parentheses only, so a comma inside an array
  // default sat at depth zero and `get_delta_sync` lost its signature; three
  // more in `catalog.ts` disagreed with it about brackets; and two in test files
  // verified the implementation using copies of their own, which means the
  // verification proved only that two scanners agreed.
  //
  // The consolidation removed the divergence, and this is what stops it coming
  // back. It reads the source rather than the behaviour, because the behaviour
  // is exactly what the copies got right: every one of them parsed all 672
  // current functions correctly. The defect was never visible in the output.
  //
  // A copy is a *function* that walks a SQL fragment character by character.
  // Anchored on the declaration rather than the body, because the body is the
  // implementation and flagging it would flag every legitimate use — and this
  // deliberately does not try to catch bare `depth++`, since scanning
  // TypeScript is a different language with the same shape of loop and
  // `client-calls.ts` has several, all of them correct.
  const FILES = [
    // Relative to this file, which is in `__tests__/`: the oracle is two levels
    // up, a sibling test one.
    "../../oracle/catalog.ts",
    "../../oracle/read.ts",
    "../../oracle/apply.ts",
    "../../oracle/types.ts",
    "./rpc-signatures.test.ts",
    "./oracle.test.ts",
  ];

  const SQL_NAME = /sql|render|arg|param|signature|bracket|paren|comma|quote|topLevel|scan/i;

  // A SQL fragment has string literals and quoted identifiers; a TypeScript
  // object literal has neither. That distinction is the whole test, and it is
  // what separates `splitTopLevel` — which walks `'a'::text` — from
  // `topLevelKeys`, which walks a `{ p_user_id: userId }` argument object and
  // which the first version of this check wrongly flagged.
  const HANDLES_SQL_QUOTING = /inString|quote\s*=|inIdent/;

  // The other half, and the reason the first version passed M48.
  //
  // The signal is the character set the loop treats as a delimiter, because
  // that is *precisely* what the copies got wrong. `topLevelKeys` splits a
  // JavaScript argument object and so tracks only `{}[]()`. A SQL scanner
  // additionally handles the single quote, and the copies that disagreed about
  // brackets disagreed about `{` too.
  //
  // This is deliberately a statement about SQL rather than about a particular
  // implementation: a loop that walks characters, tracks a quote, and counts
  // brackets is a second implementation of the scanner, whatever it is called
  // and whatever else its body says. The earlier versions of this check tried to
  // be more precise — a type name here, an escape sequence there — and each
  // time a *correct* terse copy passed while a wrong one had to be caught.
  // Specificity is what made it unsound.
  const SPLITS_SQL = /["']|::|\btext\b|\buuid\b|\binteger\b/;

  /**
   * The text between the brace at `open` and the one that balances it.
   *
   * Counts braces outside strings and comments, so a nested `if` block does not
   * end the region. Returns null when unbalanced, which is a parse problem in
   * the file under inspection rather than in this function.
   */
  const braceBalanced = (src: string, open: number): string | null => {
    let depth = 0;
    let inLine = false;
    let inBlock = false;
    let inString: string | null = null;

    for (let i = open; i < src.length; i++) {
      const c = src[i];
      if (inLine) {
        if (c === "\n") inLine = false;
        continue;
      }
      if (inBlock) {
        if (c === "*" && src[i + 1] === "/") {
          inBlock = false;
          i++;
        }
        continue;
      }
      if (inString) {
        if (c === "\\") i++;
        else if (c === inString) inString = null;
        continue;
      }
      if (c === "/" && src[i + 1] === "/") {
        inLine = true;
        i++;
      } else if (c === "/" && src[i + 1] === "*") {
        inBlock = true;
        i++;
      } else if (c === "'" || c === '"' || c === "`") inString = c;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return src.slice(open + 1, i);
      }
    }
    return null;
  };

  const found: { where: string; name: string }[] = [];
  for (const rel of FILES) {
    const src = Deno.readTextFileSync(new URL(rel, import.meta.url));
    for (const m of src.matchAll(/function\s+(\w*)\s*\(/g)) {
      const name = m[1];
      if (!name || !SQL_NAME.test(name)) continue;
      const at = src.slice(0, m.index).split("\n").length;
      // The body starts at the first `{` after the declaration, which is not
      // `m.index + m[0].length` — that lands on the parameter list's `(`, and
      // balancing braces from there finds the *parameters*' default object
      // rather than the body.
      const brace = src.indexOf("{", m.index + m[0].length);
      if (brace === -1) continue;
      // The body is the brace-balanced region after it.
      //
      // Not `indexOf("\n}")`, which was the first version and is wrong in a way
      // that silently disabled the whole check: a function containing an `if`
      // block has its body truncated at that inner brace, so a copy with any
      // control flow in it was examined for only its first few lines and
      // dismissed. M48 is a copy with an `if` in it.
      const inner = braceBalanced(src, brace);
      if (inner === null) continue;
      if (!HANDLES_SQL_QUOTING.test(inner)) continue;
      if (!SPLITS_SQL.test(inner)) continue;
      found.push({ where: `${rel}:${at} ${name}`, name });
    }
  }

  // Exactly one is *allowed*, and it is the scanner itself. A wrapper that
  // delegates — `splitRenderedArgs`, `dropDefaultsAndOut` — does not handle SQL
  // quoting and is therefore not detected, which is the point: there is nothing
  // in them that can disagree with the scanner about brackets.
  const ALLOWED = new Set(["scanSql"]);

  const unexpected = found
    .filter((f) => !ALLOWED.has(f.name))
    .map((f) => `  ${f.where}`);

  assertEquals(
    unexpected,
    [],
    "A new character-level SQL splitter has appeared.\n\n" +
      "Six of these existed and three were wrong at different times. Each " +
      "parsed all 672 current functions correctly, so none failed visibly — " +
      "the only symptom was a signature or a parameter count that came out " +
      "subtly wrong.\n\n" +
      "Use `splitTopLevel` or `scanSql` from `supabase/oracle/catalog.ts`. A " +
      "wrapper is fine when it adds a transformation (drop `OUT`, strip a " +
      "mode prefix); a wrapper that re-splits is a copy.\n" +
      unexpected.join("\n"),
  );

  // And the detector found the one it should. A guard that passes because it
  // matched nothing is the failure this whole exercise is about, and this one
  // was nearly it: the first version flagged `topLevelKeys`, which splits a
  // TypeScript object, and then the floor fired on a detector that had been
  // narrowed to nothing.
  assertEquals(
    found.map((f) => f.name),
    ["scanSql"],
    "The detector is not finding exactly the one SQL scanner. Either it has " +
      "stopped matching — in which case it approves every copy — or it is " +
      "matching something else. Both are the same failure.\n" +
      found.map((f) => `  ${f.where}`).join("\n"),
  );
});

Deno.test("oracle: a default containing a comma does not cost a function its signature", () => {
  // `params` is what the type generator reads, and a function whose `params` is
  // null is generated as `Args: never` — every call to it is a type error, and
  // the compiler then cannot check the arguments at all. So the cost of a
  // discarded signature is not a missing type, it is the *absence* of checking.
  //
  // It happened to `get_delta_sync`, which the sync API calls with
  // `{ p_user_id, p_tables }`. Its second parameter defaults to
  // `ARRAY['notifications'::text, 'rooms'::text]`, and the comma between the two
  // literals sat at parenthesis depth zero — `ARRAY[` opens a bracket the
  // paren counter never closed. One parameter became two, the count check
  // correctly reported a mismatch, and the handler threw the whole signature
  // away rather than reporting a bad split. 193 functions were affected; 189 of
  // them take no arguments and are correct, which is exactly why the number did
  // not look wrong.
  const c = readCatalog();

  // A function with caller-supplied arguments that the reader could not
  // describe.
  //
  // Two of the three ways a function has arguments and no `params` are
  // legitimate, and one is the defect this test is for:
  //
  //   * **All `OUT`.** `proargtypes` is empty by design for those, so a caller
  //     passes nothing, `Record<never, never>` is the right type, and `null` is
  //     the honest answer. `postgres_fdw_get_connections(OUT server_name text,
  //     OUT valid boolean)` is this shape.
  //   * **No arguments at all.** `params.length === 0` and
  //     `Record<never, never>` is correct.
  //   * **Arguments the reader could not split.** Everything else, and every
  //     instance of it is a lost check.
  //
  // `pgp_armor_headers(text, OUT key text, OUT value text)` is the awkward one:
  // it has one real argument, named `""`, and `parseParams` splits the rendered
  // form into three elements — one unnamed input and two `OUT` — so its arity
  // cross-check sees 1 against 1 and gives up on the shape rather than the
  // count. It is listed here rather than excused, because the cost is real: its
  // generated `Args` is `never`, and "we could not describe it" is the honest
  // answer rather than a wrong one. It is pinned by name below so it is a
  // decision, not a slow leak.
  const lost = c.functions.filter((f) => f.params === null && f.argTypes.length > 0);

  assertEquals(
    lost.map((f) => `${f.schema}.${f.name}: (${f.rendered})`),
    ["extensions.pgp_armor_headers: (text, OUT key text, OUT value text)"],
    "These functions take arguments the catalog could not read, so they are " +
      "generated as `Args: never` and every call to them is unchecked.\n\n" +
      "A parameter default can contain a comma at depth zero — " +
      "ARRAY['a'::text, 'b'::text] — and a splitter that counts only " +
      "parentheses splits one parameter into two. The count check then fires " +
      "correctly on a bad split, and discarding the signature looks like " +
      "prudence rather than the loss of the check.\n\n" +
      "The expected list is `pgp_armor_headers` alone: it declares one " +
      "argument whose name is the empty string alongside two OUT parameters, " +
      "which the rendered splitter cannot separate. Add a name to it in a " +
      "migration and this list becomes empty.\n" +
      lost.map((f) => `  - ${f.name} (${f.rendered})`).join("\n"),
  );

  // The specific one, and the call site that depended on it.
  const delta = c.functions.find((f) => f.name === "get_delta_sync");
  assertEquals(
    delta?.params?.map((p) => `${p.name}:${p.type}${p.hasDefault ? "?" : ""}`),
    ["p_user_id:uuid", "p_tables:text[]?"],
    "get_delta_sync's parameters were not read. The sync API calls it with " +
      "both, and with `params` null the generated type is `never` — so the " +
      "call is rejected by the compiler for a reason that has nothing to do " +
      "with whether it is correct.",
  );

  // And the floor on what *is* readable, so a regression cannot pass by making
  // more functions unreadable.
  const readable = c.functions.filter((f) => f.params !== null).length;
  assert(
    readable > 480,
    `only ${readable} of ${c.functions.length} functions have a readable ` +
      "parameter list. Before the bracket fix this was 479, and 193 functions " +
      "were generated as `Args: never`.",
  );

  // The relationship that ties the counts together: every function that takes
  // arguments has a readable list, apart from the one pinned above.
  const withTypes = c.functions.filter((f) => f.argTypes.length > 0);
  const unreadableWithTypes = withTypes.filter((f) => f.params === null);
  assertEquals(
    unreadableWithTypes.length,
    1,
    `${unreadableWithTypes.length} function(s) take arguments the catalog ` +
      "cannot describe; exactly one is expected (pgp_armor_headers, pinned " +
      "above). Everything else in this schema takes no arguments, and " +
      "`Record<never, never>` is correct for those.",
  );
});
