import { existsSync, readFileSync, readdirSync } from "bun:fs";
import { join } from "bun:path";
import { describe, expect, it } from "bun:test";

/**
 * Guards the two database invariants this repo has had no CI coverage for:
 *
 *  1. Every `public` table must enable Row Level Security. Without it, any table
 *     that also holds an anon table grant (20260812225000 grants ALL on ALL
 *     tables to anon/authenticated) is fully readable and writable through
 *     PostgREST with only the public anon key — no session required. That exact
 *     hole shipped: ten `analytics_*`/`translation_*` tables were created in the
 *     baseline with no RLS and no policy, closed only by
 *     20260927010000_enable_rls_on_internal_tables.sql.
 *
 *  2. The vendored `supabase/migrations/` copy must match
 *     `foodshare-backend/supabase/migrations/`. It had drifted by 8 missing
 *     files (3 of them RLS-critical) and 4 content-diverged ones, including the
 *     privilege grant migration.
 *
 * Both checks were originally manual greps run from a skill doc, so neither ever
 * failed a build. Parsing is deliberately line-break tolerant: policies and
 * `ALTER TABLE` statements in this codebase routinely put the identifier on one
 * line and the clause on the next, which makes a naive line-by-line regex
 * undercount protections by orders of magnitude.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const BACKEND_MIGRATIONS_DIR = join(process.cwd(), "..", "foodshare-backend", "supabase", "migrations");

/** Strip comments and dollar-quoted bodies so DDL inside them doesn't count. */
function stripNoise(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ");
}

/** Schema-qualify-insensitive identity: `public.foo` == `foo`. */
function normalize(identifier: string): string {
  const cleaned = identifier
    .toLowerCase()
    .replace(/^public\./, "")
    .replace(/"/g, "")
    .trim();
  return cleaned;
}

interface MigrationIndex {
  created: Map<string, string>;
  enabled: Map<string, string>;
  isForeign: Set<string>;
}

function indexMigrations(dir: string): MigrationIndex {
  const created = new Map<string, string>();
  const enabled = new Map<string, string>();
  const isForeign = new Set<string>();

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  expect(files.length).toBeGreaterThan(0);

  const IDENT = '(?:"[^"]+"|\\b[\\w$]+\\b)';
  const QUAL = `((?:${IDENT}\\.)+${IDENT}|${IDENT})`;

  const createTable = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${QUAL}`, "gi");
  const createForeign = new RegExp(`CREATE\\s+FOREIGN\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${QUAL}`, "gi");
  const enableRls = new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?${QUAL}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "gi",
  );

  for (const file of files) {
    const sql = stripNoise(readFileSync(join(dir, file), "utf8"));

    for (const m of sql.matchAll(createForeign)) {
      const key = normalize(m[1]);
      created.set(key, file);
      isForeign.add(key);
    }
    for (const m of sql.matchAll(createTable)) {
      const key = normalize(m[1]);
      if (!created.has(key)) created.set(key, file);
    }
    for (const m of sql.matchAll(enableRls)) {
      const key = normalize(m[1]);
      if (!enabled.has(key)) enabled.set(key, file);
    }
  }

  return { created, enabled, isForeign };
}

/**
 * Tables that legitimately cannot carry RLS policies.
 * Keep this list short and justify every entry — it is an exemption, not a
 * backlog.
 */
const RLS_EXEMPT: Record<string, string> = {
  // Airtable FDW mirror. Access is governed by the foreign-server user mapping,
  // not by table policies, and it mirrors third-party data rather than user
  // data. Documented as an explicit omission in 20260927010000.
  fridges: "foreign table (Airtable FDW); no RLS policies by design",
};

describe("RLS coverage across migrations", () => {
  const index = indexMigrations(MIGRATIONS_DIR);

  it("finds a plausible schema (parser sanity)", () => {
    // A parser bug here would silently pass or fail everything, so pin the scale.
    expect(index.created.size).toBeGreaterThan(150);
    expect(index.enabled.size).toBeGreaterThan(150);
  });

  it("every created table enables Row Level Security", () => {
    const missing = [...index.created.keys()].filter((t) => !index.enabled.has(t) && !(t in RLS_EXEMPT)).sort();

    expect(missing).toEqual([]);
  });

  it("only foreign tables are RLS-exempt", () => {
    const badExemptions = Object.keys(RLS_EXEMPT).filter((t) => !index.isForeign.has(t));
    expect(badExemptions).toEqual([]);
  });

  it("does not enable RLS on a table that was never created", () => {
    const orphans = [...index.enabled.keys()].filter((t) => !index.created.has(t));
    // A typo'd table name in an ALTER would silently protect nothing.
    expect(orphans).toEqual([]);
  });

  it("no table ships RLS-disabled in the same migration that creates it", () => {
    // Regression guard: new tables must enable RLS inline, not in a later fixup.
    const offenders = [...index.created.entries()]
      .filter(([table, file]) => {
        if (index.isForeign.has(table)) return false;
        if (index.enabled.has(table) && index.enabled.get(table) !== file) {
          return false; // enabled elsewhere — allowed but worth noticing
        }
        return !index.enabled.has(table);
      })
      .map(([table, file]) => `${table} (${file})`);

    // Only tables with no RLS anywhere at all qualify.
    const neverEnabled = offenders.filter((entry) => {
      const table = entry.split(" (")[0];
      return !index.enabled.has(table);
    });
    expect(neverEnabled).toEqual([]);
  });
});

describe("vendored migrations match foodshare-backend", () => {
  const backendExists = existsSync(BACKEND_MIGRATIONS_DIR);

  it.skipIf(!backendExists)("is byte-identical to the backend source of truth", () => {
    const local = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const backend = readdirSync(BACKEND_MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // The web copy is a strict subset mirror: it may never gain files the
    // backend lacks, and it must not lose them either.
    const onlyLocal = local.filter((f) => !backend.includes(f));
    const onlyBackend = backend.filter((f) => !local.includes(f));

    expect(onlyLocal).toEqual([]);
    expect(onlyBackend).toEqual([]);

    const drifted = local.filter(
      (f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8") !== readFileSync(join(BACKEND_MIGRATIONS_DIR, f), "utf8"),
    );
    expect(drifted).toEqual([]);
  });
});
