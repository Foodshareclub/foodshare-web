/**
 * Is the generated `Database` type still the schema?
 *
 * The generator's value depends entirely on the file being derived rather than
 * maintained, and a derived file that nobody re-derives is just another
 * hand-maintained list. So the committed file is regenerated and compared
 * byte-for-byte here, which makes a schema change that forgot to regenerate it a
 * test failure rather than a bug report.
 *
 * The second thing this file does is measure what the generated type actually
 * buys. A type file that exists but covers three of the tables the code queries
 * is worse than none, because it rejects the queries it does not describe and
 * reads as coverage. So the coverage is computed from the call sites and
 * asserted, and the assertion is a ratchet: it fails when coverage goes *down*,
 * and when a new relation the code uses is not in the type.
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

import type { Catalog } from "../../oracle/catalog.ts";
import { assertCatalogIsCurrent, schema } from "../../oracle/read.ts";
import { generateTypes, isBareIdentifier, TYPES_PATH } from "../../oracle/types.ts";
import { scanCallSites, tableTargets } from "./lib/client-calls.ts";

const s = schema();
assertCatalogIsCurrent(s);

const catalog = JSON.parse(
  await Deno.readTextFile(new URL("../../oracle/catalog.json", import.meta.url)),
) as Catalog;

// =============================================================================
// The file is the catalog
// =============================================================================

Deno.test("generated types: the committed file is what the catalog generates", () => {
  const committed = Deno.readTextFileSync(TYPES_PATH);
  const { source } = generateTypes(catalog);

  assertEquals(
    committed,
    source,
    "supabase/functions/_shared/database.types.ts does not match what " +
      "supabase/oracle/catalog.json generates.\n\n" +
      "Either the schema changed and the file was not regenerated, or the " +
      "generator was changed. Both are fixed by:\n" +
      "  deno run --allow-all supabase/oracle/types.ts --write\n\n" +
      "The file says DO NOT EDIT for the same reason this test exists: a " +
      "generated file that is edited by hand is a file nobody can regenerate, " +
      "and the next regeneration silently discards the edit.",
  );
});

Deno.test("generated types: the generator is deterministic", () => {
  // A generator whose output depends on object key order would pass the test
  // above on the machine that wrote it and fail on every other one, which reads
  // as schema drift and is not.
  const a = generateTypes(catalog).source;
  const b = generateTypes(catalog).source;

  // A shuffled copy of the catalog, to prove the output does not depend on the
  // order the relations happen to arrive in. `generateTypes` sorts before it
  // emits; this is the check that it still does.
  const shuffled: Catalog = {
    ...catalog,
    relations: [...catalog.relations].reverse(),
    functions: [...catalog.functions].reverse(),
    enums: [...catalog.enums].reverse(),
  };

  assertEquals(generateTypes(shuffled).source, a);
  assertEquals(b, a);
});

// =============================================================================
// Every column type means something
// =============================================================================

Deno.test("generated types: no column type is unmapped", () => {
  const { unmapped } = generateTypes(catalog);

  // `extensions.geography` is a deliberate exception, not an oversight. The
  // value a location column carries depends on how PostgREST is asked for it —
  // a GeoJSON object or a WKT string — so neither `string` nor a point type
  // would be a fact. `unknown` makes every use of those six columns a
  // deliberate act rather than an accident.
  const ALLOWED = new Set(["extensions.geography"]);

  const unexpected = unmapped
    .filter((u) => !ALLOWED.has(u.type))
    .map((u) => `${u.type}  (${u.columns.length}: ${u.columns.slice(0, 3).join(", ")})`);

  assertEquals(
    unexpected,
    [],
    "These column types have no mapping in tsType and became `unknown`, so " +
      "nothing about a value in one of those columns is checked. `unknown` is " +
      "the right default and a wrong value is still accepted without comment, " +
      "so each one needs a decision in the generator rather than a `default: " +
      "return any`.\n" +
      unexpected.map((u) => `  - ${u}`).join("\n"),
  );

  // And the exception must still exist, or the list above is a ratchet on
  // nothing.
  const geography = unmapped.find((u) => u.type === "extensions.geography");
  assert(
    geography !== undefined && geography.columns.length === 6,
    "expected the 6 documented geography columns to still be unmapped, found " +
      `${geography?.columns.length ?? 0}. Either the mapping was added — in ` +
      "which case delete this assertion and the ALLOWED entry — or a column " +
      "changed type, in which case the comment above is out of date.",
  );
});

Deno.test("generated types: a column name that needs quoting is a schema defect", () => {
  const { quotedKeys } = generateTypes(catalog);

  // Found by this generator, not by any audit: `public.Fridges` has a column
  // called `Pantry?`, with the question mark in the name, from the baseline
  // migration. No code references it, so renaming it is safe — but it cannot be
  // renamed here without touching the baseline, and the baseline is already
  // pinned as un-replayable for two other reasons. So it is named, and the list
  // is held at exactly one entry: a second one is a new finding, not a bigger
  // list.
  assertEquals(
    quotedKeys,
    ["public.Fridges.Pantry?"],
    "A relation or column name in the schema is not a bare identifier and had " +
      "to be emitted as a quoted key. That is legal TypeScript and legal " +
      "PostgREST, and it is still a defect: it cannot be written in a dot " +
      "access, it breaks every code generator that assumes identifiers, and it " +
      "is invisible in a diff. If a name is here, it needs renaming.\n" +
      quotedKeys.map((q) => `  - ${q}`).join("\n"),
  );
});

Deno.test("generated types: every relation and column name is a usable key", () => {
  // A stricter version of the above, over everything rather than only what
  // needed quoting: it asserts the generator would notice. If `key()` ever
  // stopped quoting, this fails while the one above still passes — the list is
  // the finding, this is the alarm.
  const bad: string[] = [];
  for (const rel of catalog.relations) {
    for (const col of rel.columns ?? []) {
      if (!isBareIdentifier(col.name)) bad.push(`${rel.schema}.${rel.name}.${col.name}`);
    }
  }
  assertEquals(
    bad,
    ["public.Fridges.Pantry?"],
    "the generator is no longer reporting every name that needs quoting",
  );
});

// =============================================================================
// What the type buys
// =============================================================================

Deno.test("generated types: coverage of the relations the code queries", () => {
  const { source } = generateTypes(catalog);
  const sites = scanCallSites();
  const targets = tableTargets(sites);

  // Scoped to the schema the call site names, not to the whole file.
  //
  // The first version asked whether the bare name appeared *anywhere* in the
  // generated source, so `public.api_requests` was reported as covered because
  // `metrics.api_requests` emits a key of the same name four thousand lines
  // earlier. The compiler does not work that way — `from("api_requests")` on a
  // client pinned to `public` resolves only in `public` — so a coverage figure
  // that borrowed a key from another schema was claiming the compiler would
  // check a relation it rejects.
  const schemaBlock = (schema: string): string => {
    const start = source.indexOf(`\n  ${schema}: {`);
    if (start < 0) return "";
    const rest = source.slice(start + schema.length + 6);
    const next = /\n {2}[a-z_]+: \{/.exec(rest);
    return source.slice(start, start + schema.length + 6 + (next?.index ?? rest.length));
  };

  const covered: string[] = [];
  const notCovered: string[] = [];
  for (const key of [...targets.keys()].sort()) {
    // A literal target is a key the compiler will check. Anything the scanner
    // could not resolve to a literal is not a coverage loss, so it is counted
    // separately rather than inflating the denominator.
    const [schema, name] = key.split(".") as [string, string];
    if (schemaBlock(schema).includes(`\n      ${name}: {`)) covered.push(key);
    else notCovered.push(key);
  }

  // 23 call sites name a relation the schema does not have. They are not 27 of
  // the same thing, and the difference decides who has to act:
  //
  //   * `vault.*` is a stand-in. The oracle's `platform.sql` creates the schema
  //     and nothing in it, because Supabase Vault is not a PostgreSQL catalog
  //     the migrations can describe. The code is right and the catalog is
  //     incomplete by construction.
  //   * `inference_cache` is not a relation — it is a module.
  //   * The `billing.*` and `public.*` ones are genuinely absent, and each is
  //     classified with a reason in the column audit's `ABSENT_RELATIONS`.
  //
  // What makes this list worth holding rather than deleting is the shape of it:
  // with `Database` passed to `createClient`, all 27 become compile errors
  // instead of runtime 404s from PostgREST. Twenty-seven acknowledged silent
  // failures is the argument for the generic more than any measurement is.
  const VAULT_STANDINS = new Set(["vault.decrypted_secrets", "vault.secrets"]);
  const NOT_A_RELATION = new Set(["public.inference_cache"]);

  const standins = notCovered.filter((n) => VAULT_STANDINS.has(n) || NOT_A_RELATION.has(n));
  const genuine = notCovered.filter(
    (n) => !VAULT_STANDINS.has(n) && !NOT_A_RELATION.has(n),
  );

  assertEquals(
    genuine,
    [
      "billing.dlq_summary",
      "billing.subscription_events_dlq",
      "billing.subscription_health",
      "billing.subscription_metrics",
      "public.api_requests",
      "public.chat_messages",
      "public.chat_rooms",
      "public.favorites",
      "public.forum_bookmarks",
      "public.forum_comments",
      "public.forum_likes",
      "public.listing_requests",
      "public.map_interaction_events",
      "public.messages",
      "public.post_likes",
      "public.products",
      "public.room_activities",
      "public.room_members",
      "public.user_events",
      "public.user_experiments",
      "public.user_impact",
      "public.user_map_preferences",
      "public.user_network_profiles",
    ],
    "The code queries these relations and the schema does not have them. With " +
      "`Database` passed to `createClient` the compiler rejects each of them, " +
      "which is how this list was found. Until they are resolved — a wrong " +
      "table name corrected, or the migration that creates them made to apply " +
      "— every query in this list is a runtime error against PostgREST.\n" +
      genuine.map((n) => `  - ${n}`).join("\n"),
  );

  console.error(
    `  generated types: ${standins.length} stand-in target(s) the catalog ` +
      `cannot describe by construction (${standins.sort().join(", ")})`,
  );

  const total = covered.length + genuine.length;
  console.error(
    `  generated types: ${covered.length}/${total} relations the code ` +
      `queries are described by the type (${Math.round((covered.length / total) * 100)}%)`,
  );
  // A floor at today's value, not a target. It is 70% because 24 of the 80 are
  // relations the schema does not have, and asserting a higher number would
  // make this fail on every run until all 24 were resolved — which is a way of
  // saying nothing and being loud about it. What it must catch is coverage
  // *falling*, which means a relation left the schema or a query appeared that
  // the type cannot describe.
  //
  // The number to move is the 24, and it moves when a migration that creates one
  // of them starts applying or a wrong table name gets corrected. The ratchet
  // above is what makes that progress visible instead of assumed.
  assert(
    covered.length / total >= 0.7,
    `coverage fell to ${covered.length}/${total} (was 56/80). The generated ` +
      "type is losing relations the code depends on, which means the schema " +
      "or the code changed and one of them is wrong.",
  );
});

Deno.test("generated types: the type describes every table the catalog has", () => {
  const { source } = generateTypes(catalog);
  const missing: string[] = [];

  for (const rel of catalog.relations) {
    if (rel.kind !== "table" && rel.kind !== "view") continue;
    const marker = `\n      ${rel.name}: {`;
    if (!source.includes(marker)) missing.push(`${rel.schema}.${rel.name}`);
  }

  assertEquals(
    missing,
    [],
    "these relations are in the catalog and not in the generated type:\n" +
      missing.map((m) => `  - ${m}`).join("\n"),
  );
});
