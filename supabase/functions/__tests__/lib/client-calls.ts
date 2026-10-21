/**
 * What the code actually asks of Supabase, as data.
 *
 * Three audits need the same thing — which relation, in which schema, with
 * which columns, filtered on what — and each of them used to find it with its
 * own regular expression over `.from(`. That is why they disagreed with each
 * other and why two of their findings were wrong: a regex over `.from(` cannot
 * see the call it is inside, so it cannot know three things that decide whether
 * the relation exists at all.
 *
 * | Chain                        | What the regex saw | What it means          |
 * |------------------------------|--------------------|------------------------|
 * | `supabase.from("users")`     | `users` in public  | a table query          |
 * | `supabase.schema("vault").from("decrypted_secrets")` | `decrypted_secrets` in public | **not** a public table — it is `vault.decrypted_secrets` |
 * | `supabase.storage.from("avatars")` | `avatars` in public | **not** a table at all — it is a storage bucket |
 *
 * The second is how `_shared/vault.ts` correctly reaches the Vault and was
 * recorded as querying a table that does not exist. The third is how
 * `api-v1-profile` reaches a bucket and was recorded the same way. Both were
 * "not relations" in the pinned list, which is the right conclusion reached by
 * the wrong reasoning — and the wrong reasoning does not scale, because the
 * same regex also produced a real finding it happened to be right about, with
 * nothing on the face of the output to tell the two apart.
 *
 * So the chain is resolved rather than pattern-matched. Each call site records
 * the schema it targets, whether it is a table or a bucket, and the client it
 * came from, and the audits then ask the catalog a question that has an answer
 * instead of guessing what was meant.
 */

import { FUNCTIONS_DIR, walkTypeScript } from "./scan.ts";

/** Where a call site's data comes from. Decides which catalog answers it. */
export type Target =
  /** `supabase.from("t")` — PostgREST's default schema. */
  | { readonly kind: "table"; readonly schema: "public"; readonly name: string }
  /** `supabase.schema("s").from("t")` — an explicit schema. */
  | {
    readonly kind: "table";
    readonly schema: string;
    readonly name: string;
  }
  /** `supabase.storage.from("b")` — a bucket. Not a table, not a column. */
  | { readonly kind: "bucket"; readonly name: string };

/**
 * Which privilege a call site runs with.
 *
 * `service` bypasses RLS; `user` does not. That is the whole difference, and it
 * is why the same missing relation is a privacy exposure in one place and a
 * dead feature in another.
 */
export type ClientKind = "service" | "user" | "storage" | "unknown";

export interface CallSite {
  /** Repo-relative, e.g. `api-v1-engagement/lib/handlers/toggle.ts`. */
  readonly file: string;
  /** 1-based line, for a message a reader can jump to. */
  readonly line: number;
  readonly target: Target;
  /**
   * The identifier the `.from()` is called on.
   *
   * A filter or an order only belongs to this call site if it is chained off the
   * same receiver. `queryBuilder.eq(...)` after a `categories` query belongs to
   * whatever query `queryBuilder` came from, and attributing it to `categories`
   * is how `api-v1-search` came to be reported as reading `post_name` off a
   * table that has neither that nor a join to it.
   */
  readonly receiver: string | null;
  /**
   * Which client produced it.
   *
   * `service` bypasses RLS, `user` does not. That difference is why the same
   * missing relation is a privacy hole in one place and a dead feature in
   * another, and an audit that cannot tell them apart cannot rank its findings.
   */
  readonly client: ClientKind;
  /**
   * How the client was resolved.
   *
   * There is deliberately no interprocedural step. A `lib/` service that takes
   * the client as a parameter leaves a call site genuinely undecidable from
   * where it sits — 156 of 346 at the time of writing — and a one-level
   * resolver was written and then removed. It was a brace-matching and
   * name-matching heuristic whose wrong answers would not be visible in its
   * output, which is the failure mode this whole exercise exists to remove.
   *
   * So the count is reported as coverage instead. An audit that cannot decide
   * the client for 45% of its call sites says so, in a number, and the reader
   * knows which findings are ranked on a firm footing and which are not.
   */
  readonly resolution: "direct" | "unknown";
  /** The select string, when there is one. */
  readonly select?: string;
  /** `.eq()`/`.neq()`/... column names, in source order. */
  readonly filters: string[];
  /**
   * The values those filters carry, when they are literals.
   *
   * Read here rather than by a second statement-reader in the type audit,
   * because this is the only place a statement is scoped correctly: to the
   * `.from()` that owns it, with filters on a different receiver attributed to
   * the builder they belong to. Re-deriving the statement elsewhere put 27
   * boolean filters out of reach and reported "no findings" on ten sites.
   *
   * `value` is the literal's source text, or `null` when the value is computed
   * — `null` meaning "not decidable", never "no filter".
   */
  readonly filterValues: {
    readonly column: string;
    readonly value: string | null;
  }[];
  /** `.order()` column names, in source order. */
  readonly orders: string[];
  /** `.insert()`/`.update()`/`.upsert()` top-level keys, when the payload is a literal. */
  readonly writes: string[];
  /** The same keys with their value's source text, when the payload is a literal. */
  readonly writeValues: { readonly key: string; readonly value: string }[];
  /** True when the write payload is not a literal and its keys could not be read. */
  readonly writesOpaque: boolean;
}

// =============================================================================
// Chain resolution
// =============================================================================

/**
 * Find `.from("name")` and read the chain immediately in front of it.
 *
 * The chain is walked backwards a bounded number of characters, which is enough
 * to cover `supabase.schema("vault").from(...)` and short enough that a
 * `schema()` call belonging to some other expression cannot be picked up from
 * a hundred lines earlier. The bound is a small number of characters rather
 * than "the line" because these calls are formatted across lines, which is
 * what the previous regexes tripped over.
 */
const CHAIN_WINDOW = 160;

/** A window of source, with the offset of its first character. */
interface Window {
  text: string;
  offset: number;
}

function chainIn(text: string, fromIndex: number): Window {
  const start = Math.max(0, fromIndex - CHAIN_WINDOW);
  return { text: text.slice(start, fromIndex), offset: start };
}

/** The identifier a `.from()` is called on: `supabase`, `admin`, `sb`, ... */
function receiverOf(chain: string): string | null {
  const m = /([A-Za-z_$][\w$]*)\s*$/.exec(chain.replace(/\.storage\s*$/, ""));
  return m?.[1] ?? null;
}

/**
 * Which client a call site goes through, by resolving the receiver.
 *
 * This is not cosmetic. The two clients in this codebase are the whole of the
 * RLS story at the edge:
 *
 *   * `_shared/handler/supabase-factory.ts` builds the request-scoped client
 *     from `SUPABASE_ANON_KEY` plus the caller's `Authorization` header, and
 *     that is what `ctx.supabase` is — so RLS applies to it.
 *   * `_shared/supabase.ts` builds a singleton from
 *     `SUPABASE_SERVICE_ROLE_KEY`, and `getAdminClient` is a bare alias for it
 *     — so RLS does *not* apply.
 *
 * A missing relation is therefore two different findings depending on which one
 * it went through, and an audit that cannot tell them apart cannot rank what it
 * finds. It is also the reason the naming is worth stating: `getAdminClient`
 * being an alias of `getSupabaseClient` means the word "Supabase" in a call
 * site carries no information about privilege at all.
 *
 * Resolution is by the *nearest* preceding binding of the receiver, searched
 * through the whole file rather than a fixed window, because a handler routinely
 * rebinds `supabase` part-way down. When nothing binds it — a parameter, a
 * module-level client from another file, a receiver passed into a helper — the
 * answer is `unknown`, not a guess. An audit that assumes the more
 * privileged of two possibilities is worse than one that declines, because the
 * assumption is not visible in its output.
 */
function clientFor(
  text: string,
  at: number,
  receiver: string | null,
): CallSite["client"] {
  if (!receiver) return "unknown";

  const before = text.slice(0, at);
  const re = new RegExp(
    `(?:const|let|var)\\s+${receiver}\\s*=\\s*([\\w.]+)\\s*\\(`,
    "g",
  );
  const bindings = [...before.matchAll(re)];
  const factory = bindings.pop()?.[1];

  if (factory === "createSupabaseClient") return "user";
  if (
    factory === "getAdminClient" || factory === "getSupabaseClient" ||
    factory === "getServiceClient"
  ) {
    return "service";
  }
  if (factory === "createClient") {
    // `createClient` takes its key as an argument, so the factory name alone
    // says nothing. Read the call.
    const window = before.slice(Math.max(0, bindings.at(-1)?.index ?? 0), at);
    if (/SUPABASE_SERVICE_ROLE_KEY/.test(window)) return "service";
    if (/SUPABASE_ANON_KEY/.test(window)) return "user";
    return "unknown";
  }

  // `const { supabase } = ctx` — the request context, whose client is the
  // anon-key one. Recorded as a binding so it is a resolution rather than a
  // guess about the name.
  const destructure = new RegExp(
    `\\{[^}]*\\b${receiver}\\b[^}]*\\}\\s*=\\s*(\\w+)`,
    "g",
  );
  const from = [...before.matchAll(destructure)].pop()?.[1];
  if (from === "ctx" || from === "context" || from === "c") return "user";

  return "unknown";
}

const FROM_RE = /\.from\(\s*["'`](\w+)["'`]\s*\)/g;
const SCHEMA_RE = /\.schema\(\s*["'`](\w+)["'`]\s*\)/g;
const STORAGE_RE = /\.storage\b/g;

// =============================================================================
// Select strings
// =============================================================================

/**
 * Words in a PostgREST select string that are not column names.
 *
 * `count` is the one that bites: `.select("*, count", { count: "exact" })` is
 * idiomatic and `count` is not a column on anything. The rest are the grammar
 * and the options a caller may have interpolated into a template literal.
 */
const SELECT_KEYWORDS = new Set([
  "and",
  "columns",
  "count",
  "distinct",
  "duplicated",
  "foreign",
  "head",
  "limit",
  "not",
  "nulls",
  "offset",
  "or",
  "order",
  "outer",
  "references",
  "representation",
  "select",
]);

/**
 * The columns a select string names, with embeds removed.
 *
 * A select string mixes three things and only the first names a column:
 *
 *   `col`                  a column
 *   `alias:relation(...)`  an embedded resource, aliased
 *   `relation!fk(col,..)`  an embedded resource via a foreign key
 *
 * Reading all three as columns produced a list that was mostly embeds, which is
 * a list nobody reads and which would hide the real findings inside noise. The
 * embeds are removed whole, before anything is read as a name — blanking the
 * parentheses first left the relation name behind as a dangling token, so
 * `posts:post_id (id, title)` still reported `post_id` as a column of the
 * outer table.
 */
export function selectedColumns(select: string): string[] {
  const withoutEmbeds = select
    .replace(/\b\w+\s*:\s*\w+(?:\s*!\s*\w+)?\s*\([^()]*\)/g, " ")
    .replace(/\b\w+(?:\s*!\s*\w+)?\s*\([^()]*\)/g, " ");
  const seen = new Set<string>();
  for (const m of withoutEmbeds.matchAll(/\b([a-z_][a-z0-9_]*)\b/g)) {
    if (SELECT_KEYWORDS.has(m[1])) continue;
    seen.add(m[1]);
  }
  return [...seen];
}

/**
 * The relations a select string embeds, as `alias=relation` pairs.
 *
 * Needed by the relation audit, and by nothing else. An embed is a foreign-key
 * navigation, so it is a claim that a relationship exists — and PostgREST
 * rejects the whole statement when it does not, which is how the `forum_comments`
 * case worked: the table is called `comments` and both column audits were
 * silent about it because the relation they were checking was unknown.
 */
export function selectedEmbeds(
  select: string,
): { alias: string; relation: string }[] {
  const out: { alias: string; relation: string }[] = [];
  for (const m of select.matchAll(/\b(\w+)\s*:\s*(\w+)(?:\s*!\s*\w+)?\s*\(/g)) {
    out.push({ alias: m[1], relation: m[2] });
  }
  return out;
}

// =============================================================================
// Filters, orders, writes
// =============================================================================

/**
 * Filter and order calls, capturing the receiver.
 *
 * The receiver is captured and then required to match the statement's own
 * `.from()` receiver, because a query builder is a first-class value in this
 * codebase:
 *
 * ```ts
 * let queryBuilder = supabase.from("posts").select(...);   // ← relation: posts
 * const { data } = await supabase.from("categories").select("id").maybeSingle();
 * if (categoryData) queryBuilder = queryBuilder.eq("category_id", ...);
 * ```
 *
 * The `categories` query has no filters of its own, and the `.eq()` calls that
 * follow belong to `posts`. Scoping a statement to "from this `.from()` to the
 * next" put them on `categories` anyway, which is how `api-v1-search` came to
 * be reported as selecting `post_name` and filtering on `category_id` from a
 * table that has neither — a finding about the audit, dressed as a finding
 * about the code. The old audit pinned the same two columns and attributed
 * them to a "joined relation", which was a guess in the other direction.
 */
const FILTER_RE =
  /([A-Za-z_$][\w$]*|)\s*\.\s*(?:eq|neq|gt|gte|lt|lte|like|ilike|is|not|match|fts|textSearch|contains|overlaps)\(\s*["'`]([a-z_][a-z0-9_]*)["'`](?:\s*,\s*([^)]*?))?\s*\)?/g;
const ORDER_RE = /([A-Za-z_$][\w$]*|)\s*\.\s*order\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g;
const WRITE_RE = /\.(?:insert|upsert|update)\(\s*/g;

/**
 * Blank out comments, keeping every offset and every newline.
 *
 * Without this the reader walked straight through a `//` comment and reported
 * the prose in it as columns — the first version did exactly that, on a comment
 * explaining the very rename it was being used to verify, producing a finding
 * that named the word "and". A parser that reads English as identifiers is not
 * a parser that can be trusted near English.
 *
 * It is applied to the whole file as well as to a statement body, because the
 * same prose reaches `.from(...)`: a comment written to explain that
 * `from("users")` no longer compiles was enough to make the relation audit
 * report `users` as queried when nothing queried it.
 *
 * Two properties matter for callers:
 *
 *   * Length is preserved (comments become spaces, newlines stay newlines), so
 *     every index, slice and line number computed from the result still refers
 *     to the original file.
 *   * It is string-aware. `//` inside a string is a URL, not a comment, and
 *     replacing it would corrupt the literal the scanner is about to read.
 *     Regex literals need no special case: an unescaped `/` terminates one, so
 *     `//` cannot appear in a regex source.
 */
export function stripComments(src: string): string {
  const out = src.split("");
  let i = 0;
  let quote: string | null = null;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (quote !== null) {
      if (c === "\\") i += 2;
      else {
        if (c === quote) quote = null;
        i++;
      }
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      i++;
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }

    if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      while (i < stop) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      continue;
    }

    i++;
  }

  return out.join("");
}

/**
 * Top-level keys of an object literal, or `null` if it is not a literal.
 *
 * "Top-level" because a nested key is not a column: `insert({ profile: { id } })`
 * sets a column named `profile`, not `id`. Reading nested keys as columns
 * produces findings that name columns nobody ever writes.
 *
 * Returning `null` for a non-literal is the point. The payloads that matter most
 * are built at runtime — `{ ...base, updated_at: now }` — and a checker that
 * reported those as "no columns" would be indistinguishable from one that
 * checked them.
 */
export function literalKeys(body: string): string[] | null {
  return literalEntries(body)?.map((e) => e.key) ?? null;
}

/**
 * The top-level keys of an object literal *with their value's source text*, or
 * `null` if it is not a literal.
 *
 * The keys alone answer "does this column exist", which is what the column audit
 * asks. The value's source answers "is the thing sent to this column the right
 * shape", which is the type audit's question — and the write payloads are where
 * that question has an answer, because the filters in this codebase are almost
 * all variables.
 */
export function literalEntries(
  body: string,
): { key: string; value: string }[] | null {
  body = stripComments(body);
  let i = 0;
  while (i < body.length && /\s/.test(body[i])) i++;
  if (body[i] !== "{") return null;
  i++;

  const entries: { key: string; value: string }[] = [];

  for (;;) {
    // Advance to the next key, skipping whitespace and separators.
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length || body[i] === "}") break;

    // A spread contributes no knowable key.
    if (body[i] === ".") {
      while (i < body.length && /[.\w$]/.test(body[i])) i++;
      continue;
    }

    // The key: a bare identifier, or a quoted one.
    let key = "";
    const ch = body[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < body.length && body[i] !== quote) key += body[i++];
      i++;
    } else {
      while (i < body.length && /[A-Za-z0-9_$]/.test(body[i])) key += body[i++];
    }
    // The value runs from here to the next top-level separator, so the
    // classification below sees the whole expression rather than its first
    // token.
    let valueStart = i;
    while (valueStart < body.length && /\s/.test(body[valueStart])) {
      valueStart++;
    }
    // Past the colon, when there is one. Shorthand has no colon and no value,
    // and comes back as the empty string — which is the honest answer for
    // `{ id }`: the value is a variable, so there is nothing to check.
    if (body[valueStart] === ":") {
      valueStart++;
      while (valueStart < body.length && /\s/.test(body[valueStart])) {
        valueStart++;
      }
    }
    let valueEnd = valueStart;
    let vdepth = 0;
    while (valueEnd < body.length) {
      const c = body[valueEnd];
      if (c === "{" || c === "[" || c === "(") vdepth++;
      else if (c === "}" || c === "]" || c === ")") {
        if (vdepth === 0) break;
        vdepth--;
      } else if ((c === "," || c === ";") && vdepth === 0) break;
      valueEnd++;
    }

    if (key) {
      entries.push({ key, value: body.slice(valueStart, valueEnd).trim() });
    }

    // Step over this property's value to the next top-level separator, so a
    // comma inside a nested object or an array does not end the key.
    //
    // A shorthand — `{ id }` — has no value to step over, and stopping short of
    // handling it is how the first version of this function silently dropped
    // every shorthand key. Shorthand is idiomatic in an insert payload, so that
    // was a whole class of real write sites reported as writing nothing.
    let depth = 0;
    while (i < body.length) {
      const c = body[i];
      if (c === "{" || c === "[" || c === "(") depth++;
      else if (c === "}" || c === "]" || c === ")") {
        if (depth === 0) return entries;
        depth--;
      } else if ((c === "," || c === ":") && depth === 0) {
        // A bare `key` is shorthand; `key: value` and a trailing comma both
        // land here and both mean the next thing is a key.
        if (c === ",") break;
        // The colon: skip the value, then let the outer loop find the comma.
        i++;
        let vdepth = 0;
        while (i < body.length) {
          const v = body[i];
          if (v === "{" || v === "[" || v === "(") vdepth++;
          else if (v === "}" || v === "]" || v === ")") {
            if (vdepth === 0) return entries;
            vdepth--;
          } else if ((v === "," || v === ";") && vdepth === 0) break;
          i++;
        }
        continue;
      }
      i++;
    }
  }

  return entries;
}

// =============================================================================
// The scan
// =============================================================================

/**
 * Every `.from()` call in the functions, with the chain in front of it resolved.
 *
 * A statement is scoped from one `.from()` to the next, so a filter belonging
 * to a later query is not attributed to this one. That scoping was missing
 * before and it is a real defect rather than a theoretical one: the audit
 * reported filter columns against the wrong table whenever two queries sat in
 * the same expression.
 */
export function scanCallSites(dir: URL = FUNCTIONS_DIR): CallSite[] {
  const out: CallSite[] = [];

  for (const rel of walkTypeScript(dir)) {
    const raw = Deno.readTextFileSync(new URL(rel, dir));
    const text = stripComments(raw);

    const froms = [...text.matchAll(FROM_RE)];
    for (let k = 0; k < froms.length; k++) {
      const m = froms[k];
      const name = m[1];
      const chain = chainIn(text, m.index);

      const isStorage = [...chain.text.matchAll(STORAGE_RE)].length > 0;
      const receiver = receiverOf(chain.text);
      const schemaM = [...chain.text.matchAll(SCHEMA_RE)].pop();
      // The schema qualifier has to belong to *this* chain. `supabase.schema("a")
      // … forty lines … .from("t")` is not `a.t`, and the window is 160
      // characters precisely so the distance is bounded.
      const kind = isStorage ? ("storage" as const) : clientFor(text, m.index, receiver);

      const target: Target = isStorage ? { kind: "bucket", name } : {
        kind: "table",
        schema: schemaM?.[1] ?? "public",
        name,
      };

      // The statement: from this `.from(` to the next one.
      const nextFrom = froms[k + 1]?.index ?? text.length;
      const statement = text.slice(m.index, nextFrom);

      const selectM = /\.\s*select\(\s*[`"']([^`"']{1,900})[`"']/.exec(
        statement,
      );
      // A filter with no receiver of its own is chained off the statement's
      // `.from()`, which is the ordinary PostgREST style. A filter naming a
      // different receiver is on some other builder and belongs to that
      // builder's relation, not this one.
      const mine = (r: string) => r === "" || r === receiver;
      const filterMatches = [...statement.matchAll(FILTER_RE)]
        .filter((x) => mine(x[1]));
      const filters = filterMatches.map((x) => x[2]);
      const filterValues = filterMatches.map((x) => ({
        column: x[2],
        // A filter with no value at all — `.ilike("name", ...)` always has one,
        // but a caller may pass `undefined` — is not a literal.
        value: x[3] === undefined ? null : x[3].trim(),
      }));
      const orders = [...statement.matchAll(ORDER_RE)]
        .filter((x) => mine(x[1]))
        .map((x) => x[2]);

      const writeM = WRITE_RE.exec(statement);
      let writes: string[] = [];
      let writeValues: { key: string; value: string }[] = [];
      let writesOpaque = false;
      if (writeM) {
        // From the `(` to the matching `)`, so a second `insert(` in the same
        // statement is not mistaken for the first one's argument.
        const open = writeM.index + writeM[0].length - 1;
        let depth = 0;
        let close = statement.length;
        for (let i = open; i < statement.length; i++) {
          if ("{[( ".includes(statement[i])) depth++;
          else if ("}]) ".includes(statement[i])) {
            depth--;
            if (depth === 0) {
              close = i;
              break;
            }
          }
        }
        const entries = literalEntries(statement.slice(open + 1, close));
        if (entries === null) {
          writesOpaque = true;
        } else {
          writes = entries.map((x) => x.key);
          writeValues = entries;
        }
      }

      out.push({
        file: rel,
        line: text.slice(0, m.index).split("\n").length,
        target,
        receiver,
        client: kind,
        resolution: kind === "unknown" ? "unknown" : "direct",
        ...(selectM ? { select: selectM[1] } : {}),
        filters,
        filterValues,
        orders,
        writes,
        writeValues,
        writesOpaque,
      });
    }
  }

  return out;
}

/** Call sites that name a table, bucketed by `schema.name`. */
export function tableTargets(
  sites: readonly CallSite[],
): Map<string, CallSite[]> {
  const out = new Map<string, CallSite[]>();
  for (const s of sites) {
    if (s.target.kind !== "table") continue;
    const key = `${s.target.schema}.${s.target.name}`;
    out.set(key, [...(out.get(key) ?? []), s]);
  }
  return out;
}

/** Call sites that reach a storage bucket. */
export function bucketTargets(
  sites: readonly CallSite[],
): Map<string, CallSite[]> {
  const out = new Map<string, CallSite[]>();
  for (const s of sites) {
    if (s.target.kind !== "bucket") continue;
    out.set(s.target.name, [...(out.get(s.target.name) ?? []), s]);
  }
  return out;
}
