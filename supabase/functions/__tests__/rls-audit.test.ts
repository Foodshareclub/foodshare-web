/**
 * RLS audit: coverage and reachability.
 *
 * CLAUDE.md rule 7 states "RLS on all tables. No exceptions." That is an
 * absolute security invariant, and an invariant nobody checks is a hope. This
 * test checks both halves of it:
 *
 *   * **Coverage** — every table has RLS enabled. A table without it is fully
 *     readable and writable by the anon key.
 *   * **Reachability** — no write policy on a service-owned table is open to
 *     `anon`. RLS being *enabled* says nothing about what the policies grant,
 *     and a policy with no `TO` clause applies to `PUBLIC` — which includes
 *     anon — however service-flavoured its name is.
 *
 * The second half found two live holes: `audit_logs` and
 * `image_upload_metrics` both had `FOR INSERT WITH CHECK (true)` with no `TO`
 * clause, so the anon key could append fabricated rows to both. Closed by
 * `20261007000000_scope_service_role_insert_policies.sql`.
 *
 * ## What this reads
 *
 * `catalog.json` — the schema as PostgreSQL understands it, from applying the
 * migration corpus to a real PostgreSQL 17. `docs/oracle.md`.
 *
 * The previous version parsed the migration text, and the record of how that
 * goes is written down in this file's own history. Three defects, all of them
 * in the audit rather than the audited:
 *
 *   * `DROP POLICY` was not applied, so `address` was reported as exposing every
 *     user's street address, postal code and exact location to the anon key. It
 *     had been closed weeks earlier by
 *     `20260926000000_close_confirmed_privilege_holes.sql`. The audit reported a
 *     severe vulnerability that did not exist, because it never applied the
 *     drops — which is the whole difference between an audit and a rumour.
 *   * The policy body was matched with `.*?`, which in JavaScript does not cross
 *     a newline without `dotAll`. Every multi-line `CREATE POLICY` — the form the
 *     later migrations use — was therefore invisible, and policies that
 *     demonstrably exist were reported as absent. The same audit written in
 *     Python needed `re.S` to see them, which is what made the discrepancy
 *     visible rather than theoretical.
 *   * A quoted policy name containing spaces parsed as a policy called
 *     `Anonymous` on a table called `users`, inventing a table.
 *
 * None of those can recur here. PostgreSQL has already applied the drops, has
 * already resolved the `TO` roles, and has already rejected a policy naming a
 * function that does not exist — so a policy in `catalog.json` is a policy that
 * exists, on a table that exists, for a set of roles that resolved.
 *
 * The one thing a catalog cannot answer is *why* a policy is the way it is, so
 * the reasoning that used to live in the parser's comments now lives here, where
 * a reader will look for it.
 */

import { assert, assertEquals } from "@std/assert";

import { assertCatalogIsCurrent, schema } from "../../oracle/read.ts";
import { scanCallSites } from "./lib/client-calls.ts";

const s = schema();

const TABLES = s.relations.filter((r) => r.kind === "table");

/**
 * The tables rule 7 actually applies to: those `anon` or `authenticated` can
 * reach.
 *
 * Scoping by reachability rather than by ownership is the difference between a
 * rule that is true and a rule the schema cannot satisfy. When this audit began
 * reading every non-system schema, 9 service-only relations turned up with RLS
 * off — `auth.users`, `storage.objects`, `vault.secrets`,
 * `audit.logged_actions`, `billing.subscriptions`, `metrics.alerts` and three
 * `metrics.*` tables. None of them is readable by a client key. Exempting them
 * by name list would have been an exemption with no reason attached and no way
 * to notice one being added, so the catalogue records
 * `reachableByAnon` / `reachableByAuthenticated`, computed by PostgreSQL via
 * `has_table_privilege`, and the assertion below is scoped to that.
 *
 * Reachability is computed rather than read out of `pg_class.relacl` because
 * `relacl IS NULL` means *defaults*, not *denied* — and all 9 of those tables
 * have no explicit ACL at all. A test that concluded "no grant, therefore not
 * reachable" from `relacl` alone would be exempting tables for having never been
 * altered, which is not a statement about who can read them.
 */
const REACHABLE = TABLES.filter((r) => r.reachableByAnon || r.reachableByAuthenticated);

/** Roles that can authenticate as a client. A policy naming either reaches the public. */
const CLIENT_ROLES = new Set(["anon", "authenticated"]);

/**
 * Tables whose writes belong to the backend.
 *
 * The queue, log and analytics tables rather than a name pattern: a pattern
 * would either miss `orphaned_storage_cleanup` or sweep up tables that are meant
 * to be writable. The list is checked against the call sites by the test at the
 * bottom of this file, so it cannot quietly fall behind the code.
 */
const SERVICE_OWNED = [
  "admin_audit_log",
  // Added by the derivation at the bottom of this file, which is where the
  // reasoning for each belongs. In every case the application writes the table
  // through the service-role client and no user-scoped client writes it at all,
  // so its policies are the only thing between the anon key and its contents.
  //
  // `translations` is the one worth reading twice: it is a content table, and
  // every write to it — the localization handler, the backfill jobs and the Rust
  // worker's translation queue — goes through the service role or a role that
  // bypasses RLS. Nothing a user can do writes a translation directly.
  "geocoding_cache",
  "group_message_deletions",
  "post_activity_logs",
  "translation_backfill_jobs",
  "translation_usage_analytics",
  "translations",
  "api_analytics",
  "audit_logs",
  "email_audit_log",
  "email_delivery_log",
  "email_queue",
  "grok_usage_logs",
  "image_upload_metrics",
  "notification_delivery_log",
  "notification_digest_queue",
  "notification_queue",
  "orphaned_storage_cleanup",
  "translation_analytics",
  "translation_queue",
];

Deno.test("rls audit: every table has row-level security enabled", () => {
  assertCatalogIsCurrent(s);

  const missing = REACHABLE.filter((r) => !r.rlsEnabled).map((r) => r.name)
    .sort();

  assertEquals(
    missing,
    [],
    "These tables are reachable by the anon or authenticated key and have no " +
      "RLS, so that key reads and writes them outright. CLAUDE.md rule 7 " +
      "states RLS on all tables, with no exceptions.\n" +
      missing.map((t) => `  - ${t}`).join("\n"),
  );

  // What was skipped, stated rather than filtered — see the note on REACHABLE.
  const exempt = TABLES.filter((r) => !r.reachableByAnon && !r.reachableByAuthenticated).map((r) =>
    r.name
  ).sort();
  assert(
    exempt.length > 0,
    "no table is exempt, so reachability has stopped being computed. An " +
      "assertion whose scope collapsed to " + TABLES.length + " of " +
      TABLES.length + " is approving every table it ever skipped.\n  " +
      exempt.join("\n  "),
  );

  // And the exemption is bounded: it holds only while those tables really are
  // unreachable. If a client grant is added to one of them, it enters
  // REACHABLE and fails above until RLS is enabled with it.
  for (const t of TABLES) {
    assert(
      t.rlsEnabled || (!t.reachableByAnon && !t.reachableByAuthenticated),
      `${t.name} is reachable by a client role and does not have RLS`,
    );
  }
});

Deno.test("rls audit: the coverage is the real schema, not a parser's idea of it", () => {
  // The previous version's equivalent test asserted that its parser had found
  // more than 150 relations. That is a statement about a regex, and it stayed
  // true while the regex was reading the wrong things.
  //
  // These are statements about the schema, and each one would fail if the
  // catalog were regenerated from a partial migration chain — which is the
  // failure that let 52 of 74 files go unvalidated before the oracle existed.
  assert(
    TABLES.length > 150,
    `only ${TABLES.length} tables in the catalog; the corpus is not fully applied`,
  );
  for (const name of ["profiles", "posts", "audit_logs", "reviews"]) {
    assert(
      TABLES.some((t) => t.name === name),
      `${name} is missing from the catalog`,
    );
  }
  // `audit_logs` being RLS-enabled is what makes its INSERT policy the
  // interesting thing rather than the table.
  assertEquals(
    TABLES.find((t) => t.name === "audit_logs")?.rlsEnabled,
    true,
  );
});

Deno.test("rls audit: a table is not its own defence without FORCE", () => {
  // `ENABLE ROW LEVEL SECURITY` stops the anon key and the authenticated role.
  // It does not stop the *owner*, who bypasses policies unless
  // `FORCE ROW LEVEL SECURITY` is set too.
  //
  // Nothing in the corpus sets it, on any table. That is a real, deliberate
  // gap rather than an oversight — the edge functions connect as `service_role`,
  // which carries `BYPASSRLS` independently, so forcing it on the owner would
  // change nothing for them and would break every migration and admin script.
  // The consequence is narrower than it looks and worth stating exactly: it
  // means the *owning* role is not constrained by these policies.
  const notForced = TABLES.filter((t) => !t.rlsForced).map((t) => t.name);
  assertEquals(
    notForced.length,
    TABLES.length,
    "some tables now FORCE row-level security and some do not, so a reader " +
      "cannot reason about the owning role from the catalog alone. If that is " +
      "deliberate, say which tables and why here; if it is not, the gap is " +
      `mixed and the ${TABLES.length - notForced.length} that force it are: ` +
      notForced.slice(0, 5).join(", "),
  );
});

Deno.test("rls audit: no service-owned table accepts a client write", () => {
  assertCatalogIsCurrent(s);

  const serviceOwned = new Set(SERVICE_OWNED);

  const holes: string[] = [];
  for (const table of TABLES) {
    if (!serviceOwned.has(table.name)) continue;
    for (const policy of s.policies(table.name)) {
      // Only the write commands are in scope; a permissive SELECT on a
      // backend table is a different question and a much weaker one.
      if (policy.command === "SELECT") continue;
      // A policy with no `TO` clause applies to PUBLIC, which includes anon,
      // whatever the policy is called.
      const reaches = policy.roles.length === 0 ||
        policy.roles.some((r) => CLIENT_ROLES.has(r) || r === "public");
      if (!reaches) continue;
      holes.push(
        `${table.name}.${policy.name} [${policy.command} → ` +
          `${policy.roles.join(",") || "PUBLIC"}]`,
      );
    }
  }

  assertEquals(
    holes,
    [],
    "These write policies on a backend-owned table are reachable by the anon " +
      "key. A policy with no TO clause applies to PUBLIC, so a service-flavoured " +
      "name grants nothing on its own.\n" +
      holes.map((h) => `  - ${h}`).join("\n"),
  );
});

Deno.test("rls audit: every table only the backend writes is in the set", () => {
  assertCatalogIsCurrent(s);

  // The set above is a hand-maintained list, and a hand-maintained list is
  // exactly what rule 15 exists to stop adding: a table can be added to the
  // schema, written to by the backend, and omitted from the set, and nothing
  // else in the repository would notice.
  //
  // So the list is checked against a property derived from the call sites
  // rather than against a name pattern. The property:
  //
  //   **A table that no user-scoped client ever writes to is backend-owned.**
  //
  // Because every write in the corpus goes through either the request-scoped
  // anon-key client or the service-role singleton, "no user client writes it"
  // is a statement about every write there is. A table that fails it has no
  // user-facing write path, so its RLS policies are the only thing standing
  // between the anon key and its contents, and it belongs in the set.
  //
  // The first version of this test used the weaker property — "the service role
  // writes it" — and flagged `posts`, `profiles` and `address`, which the
  // *admin* routes write through the service role while ordinary users write
  // them through their own token. Those are user-owned tables and the flag was
  // noise; a check that cries wolf nine times on its first run is a check
  // nobody keeps.
  //
  // A table with an unresolvable writer is left out and counted. An unresolved
  // call site is not evidence in either direction, and treating it as evidence
  // would make this test inherit the resolver's coverage.
  const serviceOwned = new Set(SERVICE_OWNED);
  const writers = new Map<string, Set<"user" | "service">>();
  const indeterminate = new Set<string>();

  for (const site of scanCallSites()) {
    if (site.target.kind !== "table" || site.target.schema !== "public") {
      continue;
    }
    if (site.writes.length === 0 && !site.writesOpaque) continue;
    if (site.client === "unknown" || site.client === "storage") {
      indeterminate.add(site.target.name);
      continue;
    }
    const set = writers.get(site.target.name) ?? new Set<"user" | "service">();
    set.add(site.client);
    writers.set(site.target.name, set);
  }

  const unlisted = [...writers.entries()]
    .filter(([, set]) => set.size === 1 && set.has("service"))
    .map(([name]) => name)
    .filter((name) => !serviceOwned.has(name) && s.relation(name).ok)
    .sort();

  const alsoUnknown = unlisted.filter((n) => indeterminate.has(n));

  assertEquals(
    unlisted,
    [],
    "No user-scoped client writes to these, so their RLS policies are the only " +
      "thing between the anon key and their contents, and they are " +
      "backend-owned without being in SERVICE_OWNED.\n" +
      unlisted.map((n) => `  - ${n}`).join("\n") +
      (alsoUnknown.length
        ? `\n\n  ${alsoUnknown.length} of these also have a write call site ` +
          `whose client could not be resolved, so "no user client writes it" ` +
          `is unproven rather than established:\n` +
          alsoUnknown.map((n) => `    ? ${n}`).join("\n")
        : ""),
  );
});
