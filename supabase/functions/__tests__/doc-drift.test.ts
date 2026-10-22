/**
 * Doc drift: do the numbers in `docs/oracle.md` still describe the catalog?
 *
 * ## Why this exists
 *
 * `contract-drift.test.ts` holds `CLAUDE.md`'s *function table* against
 * `config.toml`, because two lists that agree on a count is the most dangerous
 * kind of drift. `docs/oracle.md` had the same problem in a form nothing
 * checked: about twenty hand-maintained numbers describing the catalog, the
 * audit coverage and the file counts. Seven of them were already wrong, and
 * every one of them was wrong in the direction that reads as confident.
 *
 *   | Claim                                                | Actual |
 *   |------------------------------------------------------|---------|
 *   | "505 policies"                                        | 409     |
 *   | "582 indexes"                                         | 583     |
 *   | "50 / 12 / 12" deploy modes                           | 52 / 14 / 12 |
 *   | "78 `net.http_post` calls to `/functions/v1/`"         | 16 of 72 jobs |
 *   | "276 checked against 70 skipped"                      | 332 / 26 |
 *   | "the 22 exempt ones"                                  | 21      |
 *   | "the 23 relations absent from the schema"             | 19      |
 *
 * None of those are subtle. A reader who checked any one of them against
 * `catalog.json` would find the doc wrong, and a reader who checks none of them
 * has no way to know that four of the seven describe a state that has since
 * been regenerated. That is the same failure the four regex audits made, one
 * level up: a claim maintained by hand, believed because it is written down.
 *
 * ## What is checked, and what is deliberately not
 *
 * Only numbers that *describe the current state* are checked. The document
 * also records historical facts — that the compiler found 161 errors the day
 * the generated types went in, that 28 relations went unchecked under the regex
 * parser, that `domain-monitor` has no implementation. Those are statements
 * about the past, they are not expected to still be true of the catalog, and
 * asserting them would mean deleting the record of how any of this was found.
 *
 * So the split is explicit rather than clever: the live figures live in one
 * marked table, the history lives in prose, and this test reads the table. A
 * number added to the prose is not checked; a number added to the table is.
 * That is a limitation, and it is stated here rather than left to be
 * discovered — the alternative, parsing prose for digits, is precisely the
 * technique this repository removed from four audits.
 *
 * ## Why the table is checked rather than generated
 *
 * The table could be written from the catalog at read time and never go stale.
 * It is not, deliberately: a document whose every number is filled in for it is
 * a document nobody reads, and the prose *around* these numbers is where the
 * reasoning lives — why the counts fell, which of them moved and why. The
 * numbers are the part worth keeping honest, and the way to keep them honest is
 * to make being wrong expensive, not to make being wrong impossible.
 */

import { assert, assertEquals } from "@std/assert";

import { migrationFiles, type Mode, modeFor } from "../../oracle/apply.ts";
import { assertCatalogIsCurrent, Coverage, schema } from "../../oracle/read.ts";
import { scanCallSites, tableTargets } from "./lib/client-calls.ts";
import { entryPoints } from "./lib/typecheck.ts";

const MIGRATIONS_DIR = new URL("../../migrations/", import.meta.url);
const s = schema();

// =============================================================================
// The marked table
// =============================================================================

const ORACLE_DOC = new URL("../../../docs/oracle.md", import.meta.url);
const doc = Deno.readTextFileSync(ORACLE_DOC);

/**
 * The live-figures table, as `[label, value]` pairs.
 *
 * Located by its marker comment rather than by heading text, so editing the
 * prose around it cannot silently unhook the test — the failure being a check
 * that stops reading the thing it exists to check. If the marker is missing
 * this returns an empty list and the floor below fires.
 */
function liveFigures(): [string, number][] {
  const marked = doc.split("<!-- live-figures -->")[1];
  if (!marked) return [];
  return [...marked.matchAll(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/gm)].map((m) => [
    m[1].trim(),
    Number(m[2]),
  ]);
}

/**
 * A floor on how many figures must be readable.
 *
 * The lesson of the whole file, applied to itself: a test that reads nothing and
 * finds nothing must not look like a test that read a lot and found nothing.
 * Eight is below the real count, so a row can be deleted without failing, and
 * high enough that deleting the marker, the pipe syntax or the whole table
 * cannot leave a green run.
 */
const MIN_FIGURES = 8;

Deno.test("doc: the live-figures table is read, not silently empty", () => {
  const figures = liveFigures();
  assert(
    figures.length >= MIN_FIGURES,
    `only ${figures.length} live figures were read from docs/oracle.md; ` +
      `at least ${MIN_FIGURES} are expected.\n\n` +
      "The table is found by its `<!-- live-figures -->` marker. If that " +
      "comment was removed, or a row was reformatted so the two-column " +
      "`| label | number |` shape no longer matches, this test is reading " +
      "nothing and the numbers in the document are unchecked again.",
  );
});

// =============================================================================
// The measurements
// =============================================================================

/** Column-audit coverage, recomputed the way `column-audit.test.ts` does. */
function columnCoverage(): Coverage {
  const coverage = new Coverage();
  for (const [key, group] of tableTargets(scanCallSites())) {
    const bare = key.split(".").pop()!;
    if (key.includes(".") && key.split(".")[0] !== "public") continue;
    const rel = s.relation(`public.${bare}`);
    if (!rel.ok) {
      coverage.skipped(`${rel.reason}: ${bare}`);
      for (let i = 0; i < group.length; i++) coverage.readOne();
      continue;
    }
    for (const site of group) {
      coverage.readOne();
      if (site.writesOpaque) coverage.skipped(`opaque write payload: ${bare}`);
    }
  }
  return coverage;
}

/** Distinct relations named by a call site that no migration creates. */
function absentRelations(coverage: Coverage): number {
  return coverage.reasons().filter(([r]) => r.startsWith("no-such-relation")).length;
}

const TABLES = s.relations.filter((r) => r.kind === "table");
const coverage = columnCoverage();

/** `/functions/v1/<name>` targets among the catalog's scheduled jobs. */
const CRON_TARGETS = s.cronJobs.filter((j) => /functions\/v1\//.test(j.command)).length;

/**
 * Deploy modes, using the oracle's own `modeFor`.
 *
 * Imported rather than reimplemented, because `oracle.test.ts` already pins that
 * function against the two patterns in `scripts/deploy.sh` and asserts the
 * classification in both directions. A third copy here would be a fourth
 * implementation of a rule that has one, and the copy that drifted would be the
 * one nobody checks.
 */
function deployModes(): Record<string, number> {
  const counts: Record<string, number> = {
    wrapped: 0,
    "self-contained": 0,
    "non-transactional": 0,
  };
  for (const file of migrationFiles()) {
    const mode: Mode = modeFor(Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR)));
    counts[mode]++;
  }
  return counts;
}

const modes = deployModes();

const ACTUAL: Record<string, number> = {
  "relations in the catalog": s.relations.length,
  "tables in the catalog": TABLES.length,
  "functions in the catalog": s.functions.length,
  // A function declared without parameter names has `proargnames` NULL, which is
  // not an error and is not the same as having no parameters. It matters because
  // the RPC audit can only check such a call by arity, and a reader that took
  // names from the rendered types instead would invent them and report success.
  "functions the catalog records no parameter names for":
    s.functions.filter((f) => f.args === "").length,
  // A function the reader could not describe is generated as `Args: never`, which
  // is not a missing type but the *absence* of checking. 193 of these were
  // discarded at one point because a comma inside an array default sat at
  // bracket depth zero and the arity cross-check fired on the bad split. The
  // residual two are `OUT`-only functions, where `proargtypes` is empty by
  // design and there is nothing for a caller to pass.
  "functions the catalog could not describe a parameter list for":
    s.functions.filter((f) => f.params === null).length,
  "policies in the catalog": s.catalog.policies.length,
  "indexes in the catalog": s.catalog.indexes.length,
  "enums in the catalog": s.enums.length,
  "scheduled jobs in the catalog": s.cronJobs.length,
  "scheduled jobs that post to `/functions/v1/`": CRON_TARGETS,
  "migrations that do not apply": s.unapplied.length,
  "substitutions in `substitutions.json`": s.catalog.substitutions.length,
  "migrations applied in `wrapped` mode": modes.wrapped,
  "migrations applied in `self-contained` mode": modes["self-contained"],
  "migrations applied in `non-transactional` mode": modes["non-transactional"],
  // `entryPoints()` rather than `walkTypeScript`, and the difference is the
  // whole point of that function: the type-check budget covers `__tests__` as
  // well as the functions, because `deno task test` runs with `--no-check` and
  // the test files are therefore only checked by this run. Counting the
  // functions alone would have produced 373 and quietly disagreed with a
  // number that is about the union.
  "TypeScript files the type-check budget covers": entryPoints().length,
  "call sites the column audit could read": coverage.read,
  "call sites the column audit could not read": coverage.unchecked,
  "distinct relations named by a call site that the schema lacks": absentRelations(coverage),
  "tables no client role can reach, and so exempt from rule 7": TABLES.filter(
    (r) => !r.reachableByAnon && !r.reachableByAuthenticated,
  ).length,
  "tables a client role can reach that lack RLS": TABLES.filter(
    (r) => (r.reachableByAnon || r.reachableByAuthenticated) && !r.rlsEnabled,
  ).length,
};

// =============================================================================
// The assertion
// =============================================================================

Deno.test("doc: every live figure in docs/oracle.md is the number it is about", () => {
  assertCatalogIsCurrent(s);

  const figures = liveFigures();
  const wrong: string[] = [];
  const unknown: string[] = [];

  for (const [label, claimed] of figures) {
    const actual = ACTUAL[label];
    if (actual === undefined) {
      unknown.push(label);
      continue;
    }
    if (actual !== claimed) {
      wrong.push(`  ${label}\n      doc says ${claimed}, actual is ${actual}`);
    }
  }

  assertEquals(
    unknown,
    [],
    "docs/oracle.md has a live figure this test does not know how to measure. " +
      "A row nobody checks is a row that will drift, so either add the " +
      "measurement to ACTUAL above or take the row out of the table.\n" +
      unknown.map((u) => `  - ${u}`).join("\n"),
  );

  assertEquals(
    wrong,
    [],
    "docs/oracle.md states numbers that the catalog no longer supports.\n\n" +
      "These are hand-maintained, and they drift silently: the document reads " +
      "the same either way, and nothing that compiles or tests can see a digit " +
      "in a Markdown table. Either the measurement changed — in which case the " +
      "figure is the wrong one and the surrounding prose may need revising too — " +
      "or the number is a historical fact that has drifted into the present " +
      "tense, and belongs in the prose rather than in this table.\n" +
      wrong.join("\n"),
  );
});

Deno.test("doc: the measured numbers are themselves plausible", () => {
  // The table above is only worth checking if the thing it measures is the
  // thing the document claims. A reader who finds a number wrong needs to be
  // able to tell which side is wrong, and the first instinct on a mismatch
  // should not be "the test is measuring the wrong thing again".
  //
  // These are floors and ceilings in the shape the failures actually take: a
  // catalog that collapsed, an audit that stopped matching, a replacement pass
  // that found nothing because it replaced everything.
  assert(
    ACTUAL["relations in the catalog"] > 150,
    "the catalog is small enough that it is not the schema this document describes",
  );
  assert(
    ACTUAL["call sites the column audit could read"] > 200,
    "the column audit is reading almost nothing; every figure derived from it " +
      "is a figure about a scan that stopped working",
  );
  assert(
    ACTUAL["call sites the column audit could not read"] > 0,
    "the column audit skipped nothing at all, which means the `Coverage` " +
      "accounting stopped — an audit that can check everything is a claim, " +
      "not a measurement, and the 7 opaque write payloads in this corpus are " +
      "known to exist",
  );
  assert(
    ACTUAL["migrations that do not apply"] > 0,
    "every migration applied. That is either the corpus being fixed — in which " +
      "case `oracle.test.ts` has to be updated and this row with it — or the " +
      "check reading nothing. `unapplied` is the set the pinned reasons are " +
      "held against, and an empty one is a check that stopped looking.",
  );
  assert(
    ACTUAL["tables a client role can reach that lack RLS"] === 0,
    "a table a client role can reach has no RLS. This is CLAUDE.md rule 7 and " +
      "it is also a figure in this document, so the two now disagree.",
  );
});
