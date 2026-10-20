import { readFileSync, readdirSync } from "bun:fs";
import { join } from "bun:path";
import { describe, expect, it } from "bun:test";

/**
 * Guard against the specific hole this tree shipped twice.
 *
 * `20260812200000` granted ALL on every table in `public` to `anon`, and the
 * baseline created several `FOR SELECT USING (true)` policies. Together those
 * mean: whatever such a policy names is readable by anyone holding the public
 * anon key, which is a hard-coded constant in every browser bundle. That is
 * how `profiles` ended up publishing every member's email, phone, birth date,
 * home coordinates and — the part that mattered — the live
 * `verification_code` used to confirm an email address without receiving it.
 *
 * The existing rls-coverage test checks that every table *enables* RLS. That
 * is necessary and not sufficient: a table with RLS on and a `USING (true)`
 * SELECT policy is completely open, and the table can be the one holding
 * everyone's credentials.
 *
 * So this asserts the stronger property, from the catalog text in the migration
 * files: no `USING (true)` SELECT policy may survive on a table whose name or
 * columns mark it as holding user-private data. A new table in that category
 * therefore has to be added here deliberately, with a reason, instead of
 * arriving by default with the whole table readable.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Strip comments and dollar-quoted bodies so example DDL does not count. */
function stripNoise(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ");
}

const IDENT = '(?:"[^"]+"|\\b[\\w$]+\\b)';
const QUAL = `((?:${IDENT}\\.)+${IDENT}|${IDENT})`;

/**
 * Tables whose rows describe a person, or preserve something a person wrote
 * and someone else later had removed. Each entry is a justification, not a
 * to-do list — adding a name here asserts that the category is real.
 */
const PRIVATE_TABLES: Record<string, string> = {
  profiles: "email, phone, birth_date, home location, verification_code",
  user_addresses: "street address of the member",
  telegram_user_activity: "behavioural profile derived from messages",
  views: "per-user browsing history",
  // Not personal data, but a moderation bypass: content a moderator required
  // to be removed survives verbatim and is retrievable forever with the anon
  // key.
  forum_post_history: "every previous revision of every forum post",
  forum_comment_history: "every previous revision of every forum comment",
  // Internal telemetry keyed to a user id.
  translation_analytics: "per-user request counts, latency and cache-hit rate",
};

interface Policy {
  table: string;
  name: string;
  command: string;
  /** True when the policy is a bare `USING (true)` with no role restriction. */
  openToEveryone: boolean;
}

function collectPolicies(sql: string): Policy[] {
  const policies: Policy[] = [];

  const createPolicy = new RegExp(
    `CREATE\\s+POLICY\\s+(?:"([^"]+)"|([^\\s(]+))\\s+ON\\s+${QUAL}\\s+FOR\\s+(\\w+)([\\s\\S]*?)(?=;)`,
    "gi",
  );
  for (const match of sql.matchAll(createPolicy)) {
    const name = match[1] ?? match[2];
    const table = match[3]
      .toLowerCase()
      .replace(/^public\./, "")
      .replace(/"/g, "");
    const command = match[4].toUpperCase();
    const body = match[5] ?? "";

    const using = /\bUSING\s*\(\s*true\s*\)/i.test(body) || /\bUSING\s*\(\s*\(\s*true\s*\)\s*\)/i.test(body);

    // A `USING (true)` policy is open when it is not scoped away from the
    // public key. Two ways to be open, and both have to be caught:
    //
    //   - no `TO` clause at all, which means PUBLIC, anon included;
    //   - `TO anon` (or `TO PUBLIC`) spelled out, which is the same hole with
    //     better manners.
    //
    // `TO authenticated` is a deliberate restriction and is not this finding:
    // every logged-in member can read the row, which is a different question
    // from "the internet can".
    const toClause = body.match(/\bTO\s+([^\s,]+(?:\s*,\s*[^\s,]+)*)/i);
    const namedRoles = toClause
      ? toClause[1].split(",").map((role) => role.trim().toLowerCase().replace(/"/g, ""))
      : [];
    const scopedToPublic = namedRoles.length === 0 || namedRoles.includes("anon") || namedRoles.includes("public");

    policies.push({
      table,
      name,
      command,
      openToEveryone: using && scopedToPublic && command !== "INSERT",
    });
  }

  return policies;
}

/**
 * Reduce the migration history to the policies that are actually live.
 *
 * The history is a sequence, not a snapshot, so this folds it in order: a
 * CREATE adds, a DROP removes. A global "was it ever dropped" set would be
 * wrong in a way that matters — `DROP POLICY IF EXISTS` before a later
 * `CREATE POLICY` of the same name is legal and leaves the policy live, and a
 * set-based check would score that as closed.
 */
function survivingPolicies(): Policy[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const live = new Map<string, Policy>();

  for (const file of files) {
    const sql = stripNoise(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

    for (const match of sql.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"|([^\s;]+))\s+ON\s+([^\s;]+)/gi)) {
      const name = (match[1] ?? match[2]).toLowerCase();
      const table = (match[3] ?? "")
        .toLowerCase()
        .replace(/^public\./, "")
        .replace(/"/g, "");
      live.delete(`${table}|${name}`);
    }

    for (const policy of collectPolicies(sql)) {
      live.set(`${policy.table}|${policy.name.toLowerCase()}`, policy);
    }
  }

  return [...live.values()];
}

describe("no world-readable policy on a table holding user-private data", () => {
  const policies = survivingPolicies();

  it("finds the migration corpus", () => {
    // A parsing regression here would make every assertion below vacuous.
    expect(policies.length).toBeGreaterThan(50);
  });

  it("leaves no private table with a USING (true) SELECT policy", () => {
    const exposed = policies
      .filter((policy) => policy.openToEveryone && policy.command === "SELECT" && policy.table in PRIVATE_TABLES)
      .map((policy) => `${policy.table} :: "${policy.name}" (${PRIVATE_TABLES[policy.table]})`);

    expect(exposed).toEqual([]);
  });

  it("documents every table it protects, with the columns that justify it", () => {
    // A name-only entry would let someone claim protection for a table the
    // category does not actually describe.
    for (const [table, justification] of Object.entries(PRIVATE_TABLES)) {
      expect(justification.length).toBeGreaterThan(10);
      expect(policies.some((policy) => policy.table === table)).toBe(true);
    }
  });

  it("has no SELECT policy on profiles that is open to anon", () => {
    // The narrower, higher-value assertion: stated separately so the failure
    // names the actual incident rather than a category.
    const openProfiles = policies.filter(
      (policy) => policy.table === "profiles" && policy.command === "SELECT" && policy.openToEveryone,
    );
    expect(openProfiles.map((p) => p.name)).toEqual([]);
  });
});
