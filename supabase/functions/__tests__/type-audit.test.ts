/**
 * Type audit: does the value the code passes match the column's type?
 *
 * The column audit asks whether a name exists. This asks whether the thing sent
 * alongside it is the right shape, which is the other half of the same question
 * and a genuinely different failure: a correctly-named column with a `text`
 * value where the column is `integer` fails in a way nothing upstream catches.
 *
 * ## Why this could not exist before the catalog
 *
 * Knowing `attempts` is `integer` means knowing the schema, and a column's
 * *type* is the hardest thing to recover from SQL text — it can be spelled four
 * ways (`integer`, `int4`, `int`, and with a typmod) and written across lines.
 * So the previous audits checked names and stopped there, silently, and a type
 * mismatch looked exactly like a clean run.
 *
 * | Check                        | Catches                                       |
 * |------------------------------|-----------------------------------------------|
 * | enum labels                  | a string the enum has no label for            |
 * | literals against column type | `'yes'` for a `boolean`, `true` for an `int`   |
 *
 * ## What it does not check
 *
 * Computed values. `.eq("attempts", count + 1)` is skipped rather than assumed
 * fine, and counted as undecidable, because a checker reporting "no findings"
 * for a field it never looked at is the same silent gap one layer down.
 *
 * The decidable set is a few hundred sites, which is honest rather than
 * impressive, and the counts are asserted so the scope stays visible and cannot
 * shrink without the suite noticing.
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

import { assertCatalogIsCurrent, Coverage, schema } from "../../oracle/read.ts";
import { scanCallSites } from "./lib/client-calls.ts";

const s = schema();
const sites = scanCallSites();
const coverage = new Coverage();

// =============================================================================
// Reading literal values
// =============================================================================

type LiteralKind = "string" | "number" | "boolean" | "null" | "other";

function classifyLiteral(source: string): LiteralKind {
  const t = source.trim();
  if (t === "" || t === "null" || t === "undefined") return "null";
  if (t === "true" || t === "false") return "boolean";
  if (/^-?\d+(\.\d+)?$/.test(t)) return "number";
  if (/^["'`]/.test(t)) return "string";
  return "other";
}

/**
 * The value of a string literal, unquoted and with escapes resolved.
 *
 * Only the escapes that can appear in a label are resolved. Anything else is
 * left as the two-character sequence, which is what an enum label will not
 * equal -- so a value the audit cannot read is skipped rather than reported as
 * a mismatch. A false positive here would train a reader to ignore the output,
 * which is the expensive direction to be wrong in.
 */
function literalValue(source: string): string | null {
  const t = source.trim();
  if (!/^["'`][\s\S]*["'`]$/.test(t)) return null;
  const body = t.slice(1, -1);
  if (/\\[^nrtbf0'"\\]/.test(body)) return null;
  return body
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// =============================================================================
// Column types
// =============================================================================

/**
 * The families the checks distinguish.
 *
 * `character varying(10)` and `character varying(255)` are one family, not
 * three: the checks are about what a value means, and a length limit is a
 * constraint the database applies rather than a type the code has to match.
 */
type Family =
  | "boolean"
  | "integer"
  | "numeric"
  | "json"
  | "uuid"
  | "temporal"
  | "text"
  | "enum"
  | "array"
  | "other";

function familyOf(type: string): Family {
  const t = type.toLowerCase();
  if (t.endsWith("[]")) return "array";
  if (s.enum(type).ok) return "enum";
  // Strip the typmod: `character varying(10)` is `text` for this purpose.
  const base = t.replace(/\(.*\)$/, "").trim();
  switch (base) {
    case "boolean":
      return "boolean";
    case "smallint":
    case "integer":
    case "bigint":
    case "smallserial":
    case "serial":
    case "bigserial":
      return "integer";
    case "numeric":
    case "decimal":
    case "real":
    case "double precision":
      return "numeric";
    case "json":
    case "jsonb":
      return "json";
    case "uuid":
      return "uuid";
    case "date":
    case "time without time zone":
    case "time with time zone":
    case "timestamp without time zone":
    case "timestamp with time zone":
      return "temporal";
    case "text":
    case "character varying":
    case "character":
    case "citext":
      return "text";
    default:
      return "other";
  }
}

/** `relation.column` → type, for every column in the given families. */
function columnsOfFamilies(families: Family[]): Map<string, string> {
  const want = new Set(families);
  const out = new Map<string, string>();
  for (const r of s.relations) {
    for (const c of r.columns) {
      if (want.has(familyOf(c.type))) out.set(`${r.name}.${c.name}`, c.type);
    }
  }
  return out;
}

/** `relation.column` → the labels of its enum type. */
function enumColumns(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of s.enums) {
    for (const r of s.relations) {
      for (const c of r.columns) {
        if (c.type === e.qualified) out.set(`${r.name}.${c.name}`, e.labels);
      }
    }
  }
  return out;
}

/**
 * Every literal a call site pairs with one of this relation's columns.
 *
 * Both surfaces, because they are not the same size: 333 filter values of which
 * 23 are decidable, against 288 write-payload values of which far more are.
 * The code filters with variables and *writes* with literals — an insert is
 * built once and a filter is built per request — so an audit that looked only
 * at filters would have been looking at 7% of what it can check.
 */
function* valuesOn(relation: string) {
  for (const site of sites) {
    if (site.target.kind !== "table" || site.target.schema !== "public") continue;
    if (site.target.name !== relation) continue;
    for (const f of site.filterValues) {
      yield { site, column: f.column, value: f.value, surface: "filter" };
    }
    for (const w of site.writeValues) {
      // Shorthand -- `{ id }` -- yields an empty value, which is a variable and
      // so has nothing to check.
      if (w.value === "") continue;
      yield { site, column: w.key, value: w.value, surface: "write" };
    }
  }
}

// =============================================================================
// Enum labels
// =============================================================================

Deno.test("type audit: every enum-typed column is compared with a label its type has", () => {
  assertCatalogIsCurrent(s);

  const columns = enumColumns();
  // Without this the test passes on a schema whose types are unqualified, and
  // that is exactly what happened once: the enums section exported bare names
  // and the columns section qualified ones, so the comparison matched nothing
  // and the audit reported five types it was plainly looking at.
  assert(
    columns.size >= 5,
    `only ${columns.size} enum columns found. The catalog's type names and its ` +
      "enum names are not in the same form, so this check would pass vacuously.",
  );

  const wrong: string[] = [];
  for (const [key, labels] of columns) {
    const [relation, column] = key.split(".");
    for (const f of valuesOn(relation)) {
      if (f.column !== column || f.value === null) continue;
      const value = literalValue(f.value);
      if (value === null) {
        coverage.skipped(`unreadable value for ${column}`);
        continue;
      }
      coverage.readOne();
      if (!labels.includes(value)) {
        wrong.push(
          `${f.site.file}:${f.site.line}  ${key} (${labels.length} labels) is ` +
            `(${f.surface}) is compared with "${value}", which is not one of them`,
        );
      }
    }
  }

  assertEquals(
    [...new Set(wrong)].sort(),
    [],
    "These compare an enum column with a value the type has no label for. " +
      "PostgreSQL rejects the statement, so the query fails outright rather " +
      "than falling back to a default.\n" +
      wrong.map((w) => `  - ${w}`).join("\n"),
  );
});

// =============================================================================
// Literals against column types
// =============================================================================

Deno.test("type audit: a boolean column is not filtered with a non-boolean", () => {
  assertCatalogIsCurrent(s);

  const boolColumns = columnsOfFamilies(["boolean"]);
  assert(
    boolColumns.size > 50,
    `only ${boolColumns.size} boolean columns; the export has lost its types`,
  );

  const wrong: string[] = [];
  for (const [key] of boolColumns) {
    const [relation, column] = key.split(".");
    for (const f of valuesOn(relation)) {
      if (f.column !== column || f.value === null) continue;
      const kind = classifyLiteral(f.value);
      if (kind === "other") {
        coverage.skipped(`computed value for ${column}`);
        continue;
      }
      coverage.readOne();
      // PostgREST sends everything as text and PostgreSQL casts, so `"true"` is
      // accepted for a boolean. What is *not* accepted is a word, and the
      // interesting case is a number: `is_read=1` does not fail — it casts to
      // true, so the filter silently means something else.
      if (kind === "string") {
        const value = literalValue(f.value);
        if (value !== null && !["true", "false", "t", "f"].includes(value)) {
          wrong.push(
            `${f.site.file}:${f.site.line}  ${key} is a boolean ` +
              `(${f.surface}) compared with "${value}", not one of true/false/t/f`,
          );
        }
      } else if (kind === "number") {
        wrong.push(
          `${f.site.file}:${f.site.line}  ${key} is a boolean compared with ` +
            `the number ${f.value.trim()}. PostgreSQL casts a nonzero number to ` +
            "true, so this filters for the wrong rows rather than failing.",
        );
      }
    }
  }

  assertEquals(
    wrong,
    [],
    "A boolean column is filtered with a value that is not a boolean.\n" +
      wrong.map((w) => `  - ${w}`).join("\n"),
  );
});

Deno.test("type audit: a numeric column is not filtered with a word", () => {
  assertCatalogIsCurrent(s);

  const numeric = columnsOfFamilies(["integer", "numeric"]);
  assert(
    numeric.size > 200,
    `only ${numeric.size} numeric columns; the export has lost its types`,
  );

  const wrong: string[] = [];
  for (const [key, type] of numeric) {
    const [relation, column] = key.split(".");
    for (const f of valuesOn(relation)) {
      if (f.column !== column || f.value === null) continue;
      const kind = classifyLiteral(f.value);
      if (kind === "other") {
        coverage.skipped(`computed value for ${column}`);
        continue;
      }
      // A numeric column accepts a numeric *string* — PostgREST sends text —
      // so the finding is a value that cannot be cast at all.
      if (kind === "string") {
        const value = literalValue(f.value);
        if (value !== null && !/^-?\d+(\.\d+)?$/.test(value)) {
          wrong.push(
            `${f.site.file}:${f.site.line}  ${key} is ${type} ` +
              `(${f.surface}) compared with the string "${value}", ` +
              "which is not a number",
          );
        }
      } else if (kind === "boolean") {
        wrong.push(
          `${f.site.file}:${f.site.line}  ${key} is ${type} (${f.surface}) ` +
            `compared with ${f.value.trim()}, which casts to ` +
            `${f.value.trim() === "true" ? "1" : "0"}`,
        );
      }
    }
  }

  assertEquals(
    wrong,
    [],
    "A numeric column is filtered with a value that cannot be cast to it.\n" +
      wrong.map((w) => `  - ${w}`).join("\n"),
  );
});

// =============================================================================
// Coverage
// =============================================================================

Deno.test("type audit: the checks saw the corpus, and report what they could not", () => {
  // The numbers, not an impression. A type checker that quietly examined nothing
  // is the failure this project has now hit four times, and "no findings" is
  // the shape it takes.
  // The measured value is small, and the reason is the finding rather than a
  // shortcoming of the audit. See the next test.
  const capturedFilters = sites.reduce((n, x) => n + x.filterValues.length, 0);
  const capturedWrites = sites.reduce((n, x) => n + x.writeValues.length, 0);
  assert(
    coverage.read >= 30,
    `only ${coverage.read} values were decidable out of ` +
      `${capturedFilters} filter and ${capturedWrites} write-payload values. ` +
      "Either the literals stopped being found -- in which case every check " +
      "above is passing on almost nothing -- or the code has become " +
      "substantially more dynamic, which is worth knowing either way.",
  );
  assert(
    coverage.unchecked > 0,
    "no call site was skipped for a value the audit could not read. Possible, " +
      "and not to be assumed: an audit that cannot say what it did not look " +
      "at cannot be told apart from one that looked at everything.",
  );
  assert(
    s.enums.length >= 4,
    "fewer enum types than the schema has; the export has lost them and the " +
      "label check is running on nothing",
  );
});

// =============================================================================
// Why this audit is necessary at all
// =============================================================================

Deno.test("type audit: the compiler checks every factory, and not the rest", () => {
  // This test used to assert the opposite: that neither `createClient` call had
  // a `Database` generic, and that consequently no column name, column type or
  // nullability anywhere in this codebase was checked by TypeScript. It pinned
  // `["_shared/handler/supabase-factory.ts", "_shared/supabase.ts"]` so that the
  // day both acquired the generic it would fail and say what had changed.
  //
  // That day was Phase 4. `supabase/oracle/types.ts` now generates `Database`
  // from `catalog.json` — 237 relations, 672 functions, every enum — and both
  // factories pass it, so the compiler rejects an unknown relation, an unknown
  // column and a wrongly-typed value on every keystroke. What this audit was
  // compensating for is gone for those cases, which is why the old assertion
  // fails now.
  //
  // What it does *not* cover is still worth a test, and it is a different set
  // than before:
  //
  //   * `.from(tableName)` with a variable. The compiler cannot know which row
  //     type applies, so those call sites are outside the generated type by
  //     construction. They are counted in the type-check baseline with a
  //     reason rather than suppressed one by one.
  //   * Values the type cannot narrow — a payload built from several
  //     variables, a column name assembled at runtime. Those are what the
  //     `coverage` figures above measure, and this file is now the only record
  //     of how much of the value surface remains undecided.
  //   * Relations the catalog does not describe at all: the 24 absent
  //     relations are absent from `Database` too, so a query against one is a
  //     type error rather than a silent runtime failure. That is the compiler
  //     doing the job, not a gap — but it means "it type-checks" is no longer
  //     proof that a query reaches a table.
  //
  // So the pin is inverted, and the assertions below are about scope rather
  // than about absence: every factory is typed, and the audit is now justified
  // only by the surface the type cannot reach.
  const factories = [
    new URL("../_shared/supabase.ts", import.meta.url),
    new URL("../_shared/handler/supabase-factory.ts", import.meta.url),
  ];

  const untyped: string[] = [];
  for (
    const url of [...factories].sort((a, b) => a.pathname.localeCompare(b.pathname))
  ) {
    const src = Deno.readTextFileSync(url);
    if (!/createClient\s*<\s*Database\s*>/.test(src)) {
      untyped.push(url.pathname.split("/supabase/functions/")[1]);
    }
  }

  assertEquals(
    untyped,
    [],
    "A client factory no longer passes the generated `Database` type. Every " +
      "column name, column type and nullability in every query it makes is " +
      "then unchecked again, and this audit is back to standing in for a " +
      "missing compiler without anything announcing that it has to.\n" +
      untyped.map((u) => `  - ${u}`).join("\n"),
  );

  // The compiler's coverage has to be real, not nominal. Passing a `Database`
  // that describes a handful of tables would satisfy the regex above while
  // rejecting correct queries against the rest — which is why the generic was
  // absent in the first place, and why an empty `untyped` on its own would be
  // a weaker statement than it looks.
  const tables = s.relations.filter((r) => r.kind === "table").length;
  assert(
    tables > 200,
    `only ${tables} tables in the catalog; the scale this coverage is measured ` +
      "against has changed",
  );
  assert(
    coverage.read > 0,
    "nothing was decidable at a call site, so the surface this audit still " +
      "owns has collapsed to zero while the file still claims to check it",
  );
});
