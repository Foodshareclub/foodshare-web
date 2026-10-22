/**
 * The type-error budget.
 *
 * `Database` is generated from the catalog and passed to both `createClient`
 * factories, so the compiler now checks every table name, column, filter, order,
 * write and RPC argument in this codebase. It found 161 errors the moment it was
 * switched on, across 16 files — and three of them were live production bugs
 * that had been failing silently:
 *
 *   * `api-v1-alerts` read and wrote `metrics.alerts`, a table that did not
 *     exist, *and* addressed it as `from("metrics.alerts")` on a client pinned
 *     to `db: { schema: "public" }` — so the request went to
 *     `/rest/v1/metrics.alerts`, which is not a route. The alert cooldown had
 *     never deduplicated anything and no alert had ever been logged.
 *   * `api-v1-email` read the authenticated user's address from a `users` table
 *     that does not exist, in the one place that decides who may send email and
 *     to whom. The endpoint has been answering 500 to every request.
 *
 * The remaining errors are the same 24 relations and 17 RPCs the earlier audits
 * already pinned by name. They are not new findings; they are the ones that were
 * already known, now enforced by the compiler instead of described in a list.
 *
 * ## Why a baseline rather than 130 suppressions
 *
 * `@ts-expect-error` on each site would be 130 comments, each of which rots: it
 * goes stale the moment the underlying defect is fixed, and nothing says so. A
 * baseline is the same information in one reviewable file, and it cannot rot
 * silently because this test fails when it does.
 *
 * So the contract is: **no error outside the baseline, and no entry in the
 * baseline that no longer occurs.** The first half means a new defect fails the
 * build. The second means a *fixed* defect also fails the build, until the file
 * is updated — which is the point. A baseline that only stops new errors is a
 * ratchet that can be padded.
 *
 * Deliberately not pinned: the total count. Pinning it would add a third
 * mechanism that fails for the same reason this file does, and it would make
 * every unrelated fix a two-file change. The count is reported on every run
 * instead, which is the only way to notice it moving.
 */

import { assert, assertEquals } from "@std/assert";

import {
  type DiagnosticCount,
  entryPoints,
  formatBaseline,
  parseDiagnostics,
  runCheck,
  totalErrors,
} from "./lib/typecheck.ts";

const BASELINE_URL = new URL("../typecheck-baseline.json", import.meta.url);

interface Baseline {
  _comment?: string;
  errors: DiagnosticCount[];
}

const raw = await runCheck();
const current = parseDiagnostics(raw);
const baseline = JSON.parse(await Deno.readTextFileSync(BASELINE_URL)) as Baseline;

const key = (d: { file: string; code: string; message: string }) =>
  `${d.file}|${d.code}|${d.message}`;

Deno.test("typecheck: the baseline is the schema this repository is written against", async () => {
  // Guards the premise rather than the data. If the type checker stops finding
  // entry points, `current` is empty, the comparison below passes, and this
  // suite reports a clean bill of health for a checker that checked nothing.
  const points = entryPoints();
  assert(
    points.length >= 350,
    `only ${points.length} TypeScript files found; the type check below is ` +
      "running on a fraction of the corpus and every result it produces is " +
      "vacuous — the budget would approve errors in the files it missed.",
  );

  // The specific failure this guard exists for, pinned rather than generalised.
  //
  // The first version checked only the 30 function entry points. That is the
  // surface a deployment exercises, so it looked like the right set — and it
  // passed on 122 errors while `deno task test` failed on 28 more, because
  // these files are reached from tests and from nothing that starts a server.
  // A budget that does not cover the surface CI runs is not a smaller budget,
  // it is a wrong one: it reports green for a build that is red.
  const missedBefore = [
    "_shared/rate-limiter.ts",
    "_shared/bot/user-state.ts",
    "_shared/email/email-service.ts",
    "api-v1-email/lib/queue.ts",
    "telegram-bot-foodshare/handlers/auth.ts",
    "telegram-bot-foodshare/services/profile.ts",
    "__tests__/typecheck-baseline.test.ts",
  ];
  const missing = missedBefore.filter((f) => !points.includes(f));
  assertEquals(
    missing,
    [],
    "These files are not in the checked set, so their type errors are outside " +
      "the budget — which is how the budget first shipped green over a red " +
      "test run.\n" + missing.map((f) => `  - ${f}`).join("\n"),
  );

  assert(
    totalErrors(current) > 0,
    "the type checker reported no type errors at all. The generated Database type is " +
      "passed to createClient, so that means the type is not reaching the " +
      "client — check the two factories, not the error list.",
  );
});

Deno.test("typecheck: no error is outside the baseline", () => {
  const known = new Map(baseline.errors.map((d) => [key(d), d.count]));
  const fresh: string[] = [];

  for (const d of current) {
    const budget = known.get(key(d)) ?? 0;
    if (d.count > budget) {
      fresh.push(
        `${d.file}\n      ${d.code}  (${d.count}×, budget ${budget})\n      ${
          d.message.slice(0, 180)
        }`,
      );
    }
  }

  assertEquals(
    fresh,
    [],
    "These type errors are not in supabase/functions/typecheck-baseline.json.\n\n" +
      "Each one is either a new defect or a real query that the generated type " +
      "cannot describe. The first kind should be fixed. The second happens when " +
      "the table name is a variable — `.from(tableName)` — where the compiler " +
      "cannot know which row type applies; those are legitimately outside the " +
      "type's reach and belong in the baseline with a reason.\n\n" +
      fresh.map((f) => `  - ${f}`).join("\n"),
  );
});

Deno.test("typecheck: no baseline entry has stopped occurring", () => {
  // The half of the contract that makes this a budget rather than a filter.
  // Without it, the file can be padded: every entry is verified to still be
  // real, so an entry cannot hide a fix.
  const happening = new Map(current.map((d) => [key(d), d.count]));
  const stale: string[] = [];

  for (const d of baseline.errors) {
    const n = happening.get(key(d)) ?? 0;
    if (n < d.count) {
      stale.push(
        `${d.file}\n      ${d.code}  (budget ${d.count}, occurring ${n})\n      ${
          d.message.slice(0, 180)
        }`,
      );
    }
  }

  assertEquals(
    stale,
    [],
    "These entries are in the baseline but the type checker no longer reports them.\n\n" +
      "Something was fixed, or an edit moved a diagnostic. Either way the " +
      "baseline is now padded: it would tolerate a regression of any of these.\n" +
      "Update it with:\n" +
      "  deno run --allow-all supabase/functions/__tests__/typecheck-baseline.test.ts --write\n\n" +
      stale.map((f) => `  - ${f}`).join("\n"),
  );
});

Deno.test("typecheck: the report", () => {
  const byFile = new Map<string, number>();
  for (const d of current) {
    byFile.set(d.file, (byFile.get(d.file) ?? 0) + d.count);
  }
  const worst = [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 8);

  console.error(
    `  type errors: ${totalErrors(current)} across ${byFile.size} files ` +
      `(baseline allows ${totalErrors(baseline.errors)})`,
  );
  for (const [f, n] of worst) console.error(`    ${String(n).padStart(3)}  ${f}`);
});

// Writing the baseline is a deliberate act, not a side effect of a test run:
// a run that silently rewrote the file it is being judged against would approve
// whatever it just found.
if (import.meta.main && Deno.args.includes("--write")) {
  await Deno.writeTextFile(BASELINE_URL, formatBaseline(current));
  console.error(
    `  wrote ${totalErrors(current)} entries to typecheck-baseline.json`,
  );
}
