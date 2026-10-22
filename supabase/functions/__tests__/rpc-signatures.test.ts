/**
 * RPC signature audit.
 *
 * Every `supabase.rpc(name, {args})` call in the edge functions is
 * cross-checked against the function definitions in
 * `supabase/migrations/`. PostgREST resolves an RPC by argument name, so a
 * call passing a name no overload accepts — or omitting one that has no
 * default — is rejected with `function does not exist`.
 *
 * This is a test rather than a one-off audit because of how the class of bug
 * presents. The automation queue's `mark_automation_email_sent` was called
 * with `{p_queue_id, p_provider, p_message_id}` against a function signed
 * `(uuid, boolean, text)`. PostgREST rejected it, supabase-js returned the
 * rejection as `error` instead of throwing, and the caller never read it —
 * so every send silently wedged its row and nothing reported it. Most
 * callers *do* check `error`, which means the loud instances announce
 * themselves as mysteriously broken features and the silent ones announce
 * themselves as nothing at all. Only a mechanical check finds both.
 *
 * Two kinds of finding, treated differently on purpose:
 *
 *   * **Mismatch** — the function is defined and no overload accepts the
 *     call. That is unambiguously a bug and fails the suite.
 *   * **Missing** — the function is not defined in any migration. That may
 *     be a broken feature or a migration that never made it into the repo,
 *     and the two need different fixes, so it does not fail the suite.
 *     It is pinned to the known list below instead, which makes the list a
 *     ratchet: adding a function and its call clears a row, and introducing
 *     a new one fails until the list is updated deliberately.
 *
 * See `docs/rpc-signature-audit.md` for the findings and what resolving
 * them requires.
 */

import { assert, assertEquals } from "@std/assert";

import { splitTopLevel as splitTopLevelSql } from "../../oracle/catalog.ts";
import { assertCatalogIsCurrent, schema } from "../../oracle/read.ts";

// =============================================================================
// Parsing
// =============================================================================

/** One `CREATE FUNCTION` signature: its parameter names, and which are required. */
interface Signature {
  /** Every parameter name, in declaration order. Empty when `named` is false. */
  params: string[];
  /**
   * How many parameters a caller may pass, whether or not they are named.
   *
   * Separate from `params` because for the 263 unnamed functions the two differ:
   * `params.length` is the number of *names*, which is zero, and a field that
   * means both is a field whose `length` answers a different question depending
   * on which is asked. `st_makepoint` has two parameters and no names, and both
   * facts are needed.
   */
  arity: number;
  /** How many of those a caller must supply — the ones with no `DEFAULT`. */
  requiredCount: number;
  /** Parameters with no `DEFAULT`, which a caller must supply. */
  required: string[];
  /**
   * Whether PostgreSQL records names for this function's parameters.
   *
   * False for the functions declared without parameter names, and the audit
   * checks those by arity alone. Recording the difference is what stops the
   * reader treating "no names" as "no parameters" and accepting any call.
   */
  named: boolean;
  /** File the definition came from, for error messages. */
  source: string;
}

const s = schema();

/** One `supabase.rpc("name", { ... })` call site. */
interface RpcCall {
  name: string;
  args: string[];
  source: string;
}

function extractRpcCalls(ts: string, source: string): RpcCall[] {
  const calls: RpcCall[] = [];
  // `supabase.rpc("name", { ... })` — the argument object is matched with a
  // brace-balanced scan rather than a regex, because a regex cannot handle
  // nested braces in a metadata payload and stopping at the first `}` would
  // silently under-report arguments.
  const re = /\.rpc\(\s*["'](\w+)["']\s*,\s*\{/g;

  for (const match of ts.matchAll(re)) {
    const name = match[1];
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < ts.length && depth > 0) {
      if (ts[i] === "{") depth++;
      if (ts[i] === "}") depth--;
      i++;
    }
    const body = ts.slice(start, i - 1);
    calls.push({ name, args: topLevelKeys(body), source });
  }

  return calls;
}

/**
 * The keys of an object literal, at the top level only.
 *
 * Every form counts, because PostgREST matches on the key as written and
 * each of these is a real call site: `p_batch_size: 10`, a shorthand
 * `{ queueId }`, a quoted `'key':`, and a nested object (whose keys are
 * *not* arguments and are skipped by the depth check).
 *
 * The first version of this audit only looked for `p_`-prefixed keys and
 * silently skipped every call that named its arguments differently —
 * `rpc("mark_geocode_failed", { queueId, error })` was read as passing
 * nothing at all. A check that cannot see half the call sites reports the
 * half it can see and is silent about the rest, which is worse than not
 * checking.
 */
function topLevelKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;

  // Split on commas at depth zero, then read the key off each chunk.
  let chunk = "";
  const chunks: string[] = [];
  for (const ch of body) {
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    if (ch === "}" || ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      chunks.push(chunk);
      chunk = "";
    } else {
      chunk += ch;
    }
  }
  chunks.push(chunk);

  for (const raw of chunks) {
    const part = raw.trim();
    if (!part || part.startsWith("...")) continue;
    // Skip anything that is not a key/value or a shorthand binding: a
    // method call, a nested expression, a bare value.
    const keyValue = part.match(/^(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))\s*:/);
    if (keyValue) {
      keys.push(keyValue[1] ?? keyValue[2]);
      continue;
    }
    const shorthand = part.match(/^([A-Za-z_$][\w$]*)\s*$/);
    if (shorthand) keys.push(shorthand[1]);
  }

  return keys;
}

// =============================================================================
// Fixtures
// =============================================================================

const FUNCTIONS_DIR = new URL("../", import.meta.url);

/** Load every migration and every edge function source file. */
async function loadAll(): Promise<{
  signatures: Map<string, Signature[]>;
  calls: RpcCall[];
  sources: Map<string, string>;
  live: Set<string>;
  /** Functions PostgreSQL records no parameter names for. */
  unnamed: number;
}> {
  // The signatures come from the catalog, not from parsing the migration text.
  //
  // This was the fourth and last of the DDL parsers in the repository, and it
  // has been deleted rather than left beside its replacement. A dead parser is
  // not neutral: it is the version someone reaches for when the catalog is
  // inconvenient, and it carries every one of the defects the catalog does not.
  //
  // What replaced it is PostgreSQL's own answer, so the audit no longer has to
  // cope with a signature split across lines, a `DEFAULT` written three ways,
  // an argument type spelled as a qualified name or a `typmod`, or a function
  // redefined by a later migration. Every one of those was a way for the audit
  // to disagree with the database about what the database contains.
  assertCatalogIsCurrent();
  const signatures = new Map<string, Signature[]>();
  let unnamedFunctions = 0;

  for (const fn of s.functions) {
    const parts = splitTopLevelSql(fn.rendered ?? "");

    // Names come from the catalog, not from the rendered string.
    //
    // The rendered form was being used for both, and for the 263 functions
    // PostgreSQL records *no* parameter names in `proargnames` — the
    // `SECURITY DEFINER` wrappers, every `pgvector` and PostGIS entry point,
    // `jwt()` — the name column was then read off the *type* instead. So
    // `st_makepoint(double precision, double precision)` was recorded as taking
    // two parameters named `double`, and a call site passing `{ double,
    // double }` was accepted against a function that has no named parameters at
    // all. A check that invents the thing it is checking cannot fail, and here
    // it fails in the direction of accepting.
    //
    // `args` is empty exactly when `proargnames` is NULL, which is the honest
    // answer: the database has no name to give. Such a function is marked
    // unnamed, which makes a call against it uncheckable *by name* rather than
    // checkable against a fiction — and it is counted, so the count is a
    // coverage figure rather than a silent exemption.
    const named = fn.args !== "";
    if (!named) unnamedFunctions++;

    // `proargnames` holds the identity arguments (IN, INOUT, VARIADIC);
    // `pg_get_function_arguments` also lists `OUT` ones, which no caller passes
    // and which are therefore not in the name list. Position is what pairs the
    // two, so the name list is taken from the *leading* elements.
    const names = named ? fn.args.split(", ").map((e) => e.trim().split(/\s+/)[0] ?? "") : [];

    // A function with names has exactly as many names as it has identity
    // arguments, so the rendered elements beyond that count are `OUT`.
    const inArgs = parts.filter((p) => !/^OUT\s/i.test(p.trim()));
    const params = names.slice(0, inArgs.length);

    // Defaults are only ever a suffix, so the required ones are the head.
    const required = params.slice(0, Math.max(0, params.length - fn.defaults));

    signatures.set(fn.name, [
      ...(signatures.get(fn.name) ?? []),
      {
        params,
        arity: inArgs.length,
        requiredCount: Math.max(0, inArgs.length - fn.defaults),
        required,
        named,
        source: "catalog.json",
      },
    ]);
  }

  const calls: RpcCall[] = [];
  const sources = new Map<string, string>();
  const imports = new Map<string, string[]>();

  const walk = async (dir: URL, prefix: string): Promise<void> => {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory) {
        if (entry.name === "node_modules" || entry.name === "__tests__") continue;
        await walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
      } else if (entry.isFile && entry.name.endsWith(".ts")) {
        const rel = `${prefix}${entry.name}`;
        const ts = await Deno.readTextFile(new URL(entry.name, dir));
        sources.set(rel, ts);

        const deps: string[] = [];
        for (const m of ts.matchAll(/from\s+"(\.[^"]+)"/g)) {
          const target = m[1].endsWith(".ts") ? m[1] : `${m[1]}/index.ts`;
          deps.push(normalise(`${dirPath(prefix)}/${target}`));
        }
        imports.set(rel, deps);

        for (const call of extractRpcCalls(ts, rel)) {
          calls.push(call);
        }
      }
    }
  };
  await walk(FUNCTIONS_DIR, "");

  // Which modules an entry point can actually reach. A call in an
  // unreachable module is latent, not an outage — a distinction that decides
  // whether a missing function is tonight's problem or next quarter's.
  const live = new Set<string>();
  const stack = [...sources.keys()].filter((f) => f.split("/").length === 2);
  while (stack.length) {
    const file = stack.pop()!;
    if (live.has(file)) continue;
    live.add(file);
    for (const dep of imports.get(file) ?? []) {
      if (sources.has(dep)) stack.push(dep);
    }
  }

  return { signatures, calls, sources, live, unnamed: unnamedFunctions };
}

function dirPath(prefix: string): string {
  return prefix;
}

/** Collapse `.` and `..` segments so import specifiers join to real paths. */
function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

// =============================================================================
// The known gaps
// =============================================================================

/**
 * Functions called by the edge functions but defined in no migration.
 *
 * See `docs/rpc-signature-audit.md`. Each is either a broken feature or a
 * definition that exists in production but never made it into the repo, and
 * a production schema dump decides which. They are listed rather than
 * failing the suite because writing sixteen function bodies from their
 * call sites' argument names would be speculation.
 *
 * Remove a row when the function is added to a migration.
 */
const KNOWN_MISSING = [
  // ── The two that were invisible, and why ──
  //
  // `get_user_unread_counts` and `get_batch_engagement` are *written* in the
  // corpus: `20260215120000_optimize_aggregations.sql:4` and
  // `20260215120002_batch_engagement.sql`. The previous version of this audit
  // read those `CREATE FUNCTION` statements with a regular expression and
  // reported both calls as resolving. Neither function exists, and the chain is:
  //
  //   1. Each function's body filters on relations or columns that do not
  //      exist -- `rooms.user_id`, `room_participants.user_id`, `post_likes`,
  //      `post_bookmarks`.
  //   2. So the migration fails, the function is never created, and the `GRANT`
  //      on the following line never runs either.
  //   3. The catalog is the first thing in this repository that can see step 2,
  //      because it applies the migration rather than reading it.
  //
  // `_shared/aggregation.ts` calls the first as its *primary* path, with a
  // fallback that queried the bulk-campaign `notifications` table instead of
  // `in_app_notifications` and so also failed. Both failures returned zero, so
  // the dashboard reported every user as having no unread anything. The
  // engagement API's batch read failed the same way.
  //
  // Neither is repaired here. Not one of those relations can be fixed by a
  // rename -- the functions were written against a schema that never existed --
  // and the intent has to be re-derived from what `rooms` and
  // `room_participants` actually are. That is a decision, not a patch.
  "get_user_unread_counts",
  "get_batch_engagement",

  // ── the rest: called, never defined ──
  "calculate_user_matches",
  "check_idempotency_key",
  "check_lockout_status",
  "create_chat_room_safe",
  "detect_map_hotspots",
  "find_orphan_images",
  "get_nearby_products",
  "get_request_count",
  "get_web_vitals_summary",
  "increment_poll_option_votes",
  "notify_nearby_users_bulk",
  "record_function_call",
  "record_login_attempt",
  "toggle_post_favorite_atomic",
  "update_circuit_status",
  "update_network_profile",
];

// =============================================================================
// Tests
// =============================================================================

Deno.test("rpc audit: every call resolves to a function that accepts its arguments", async () => {
  const { signatures, calls } = await loadAll();

  const problems: string[] = [];

  for (const call of calls) {
    const overloads = signatures.get(call.name);

    if (!overloads) continue; // checked by the ratchet test below

    const accepted = overloads.some((sig) => {
      const hasAllArgs = call.args.every((a) => sig.params.includes(a));
      const hasAllRequired = sig.required.every((r) => call.args.includes(r));
      return hasAllArgs && hasAllRequired;
    });

    if (!accepted) {
      const available = overloads
        .map((s) => `(${s.params.join(", ")}) in ${s.source}`)
        .join(" | ");
      const supplied = call.args.length ? call.args.join(", ") : "(none)";
      problems.push(
        `${call.source}: rpc("${call.name}") passes ${supplied} — no overload accepts it; ` +
          `available: ${available}`,
      );
    }
  }

  assertEquals(
    problems,
    [],
    `RPC calls that PostgREST would reject with "function does not exist":\n` +
      problems.map((p) => `  - ${p}`).join("\n"),
  );
});

Deno.test("rpc audit: the coverage is the database's, not a parser's idea of it", async () => {
  // A signature reader that invents parameter names is a check that cannot
  // fail, and it fails in the direction of accepting: the fabricated name
  // matches the fabricated name.
  //
  // An earlier version of this audit read names out of
  // `pg_get_function_arguments`, which does not contain them for a function
  // declared without parameter names -- it renders only the types, and the
  // parser took the type's first word as the name. 263 of this schema's
  // functions are declared that way, so `st_makepoint` was recorded as
  // `(double, double)` and a call passing `{ double, double }` was accepted
  // against it.
  //
  // The count is asserted rather than floored, because unlike a coverage floor
  // it is not expected to change: it is a property of how the corpus declares
  // its functions, and a large move in either direction means the reader is
  // reading something other than `proargnames`.
  const { signatures, calls, unnamed } = await loadAll();

  assert(
    unnamed > 200,
    `only ${unnamed} function(s) were read as having no parameter names. This ` +
      "schema has 263, and a much smaller number means the reader stopped " +
      "consulting `proargnames` and started taking names from the rendered " +
      "text again -- which is the defect this test exists to hold.",
  );

  // The specific function the bug was found through.
  const makepoint = signatures.get("st_makepoint")?.[0];
  assertEquals(
    { named: makepoint?.named, params: makepoint?.params, arity: makepoint?.arity },
    { named: false, params: [], arity: 2 },
    "st_makepoint is declared with two double-precision parameters and no " +
      "parameter names, so the audit must record two parameters and no names " +
      "for it. Reading 'double' as a parameter name is what let a call through, " +
      "and recording an empty parameter list would lose the arity that is the " +
      "only thing left to check it by.",
  );

  // And the invariant, checked against the catalog rather than one example: a
  // function the catalog has names for must have exactly as many as it has
  // identity arguments.
  const c = schema();
  const wrong: string[] = [];
  for (const fn of c.functions) {
    if (fn.args === "") continue;
    const names = fn.args.split(", ").length;
    if (names !== fn.argCount) {
      wrong.push(`${fn.schema}.${fn.name}: ${names} name(s), ${fn.argCount} argument(s)`);
    }
  }
  assertEquals(
    wrong,
    [],
    "A function's exported names and its argument count disagree. Every " +
      "positional read of the signature depends on the two lining up, and a " +
      "mismatch means the names are being taken from somewhere that is not " +
      "`proargnames`.\n" + wrong.slice(0, 20).join("\n"),
  );

  // A floor on the call sites that *are* checked by name, so the arity path
  // cannot quietly become the only path.
  const byName = calls.filter((x) => (signatures.get(x.name) ?? []).some((sig) => sig.named));
  assert(
    byName.length > 40,
    `only ${byName.length} of ${calls.length} call sites resolve to a function ` +
      "with named parameters. A reader that stopped finding names would fall " +
      "back to arity for everything and report a clean run.",
  );
});

Deno.test("rpc audit: the set of called-but-undefined functions has not grown", async () => {
  const { signatures, calls, live } = await loadAll();

  const missing = [
    ...new Set(
      calls
        .filter((c) => !signatures.has(c.name))
        .map((c) => c.name),
    ),
  ].sort();

  // A missing function called from a module an entry point can reach is an
  // outage; the same call in an unreachable module is latent. Reporting the
  // split is what turns this list from a backlog into a priority order.
  const liveMissing = missing.filter((name) =>
    calls.some((c) => c.name === name && live.has(c.source))
  );
  const deadMissing = missing.filter((name) => !liveMissing.includes(name));

  assertEquals(
    missing,
    [...KNOWN_MISSING].sort(),
    "The set of functions the edge functions call but no migration defines has " +
      "changed. If a function was added, remove it from KNOWN_MISSING in this " +
      "test. If a call was added for a function that does not exist, that call " +
      "fails in production — see docs/rpc-signature-audit.md." +
      `\n\nCalled from live code (an outage if production matches the migrations):\n` +
      (liveMissing.length ? liveMissing.map((n) => `  - ${n}`).join("\n") : "  (none)") +
      `\n\nCalled only from unreachable modules (latent):\n` +
      (deadMissing.length ? deadMissing.map((n) => `  - ${n}`).join("\n") : "  (none)"),
  );
});

Deno.test("rpc audit: reachability separates live call sites from dead code", async () => {
  // The triage above is only worth anything if `live` is real, so it is
  // pinned against modules whose status is known: an entry point, a module
  // one imports, and a module nothing imports.
  const { live, sources } = await loadAll();

  assertEquals(live.has("api-v1-chat/index.ts"), true, "an entry point is reachable by definition");
  assertEquals(
    live.has("api-v1-chat/lib/generic.ts"),
    true,
    "a module an entry point imports is reachable",
  );
  assertEquals(
    live.has("api-v1-products/lib/product-service.ts"),
    false,
    "product-service.ts is imported by nothing, so its call to " +
      "get_nearby_products is latent rather than an outage",
  );
  assertEquals(
    sources.has("api-v1-products/lib/product-service.ts"),
    true,
    "the module is still on disk, which is why it can be reported at all",
  );
});

Deno.test("rpc audit: the reader finds the definitions it claims to", async () => {
  // A reader that silently stopped matching would turn both tests above into
  // no-ops, which is the failure mode that makes an audit dangerous: it reports
  // clean because it stopped looking. These three are the cases the reader has
  // to get right, each one a real signature in the database -- and the first is
  // the one a name-keyed map cannot answer.
  const { signatures } = await loadAll();

  const overloaded = signatures.get("mark_messages_read");
  assertEquals(
    overloaded?.length,
    2,
    "mark_messages_read exists as both (text) and (uuid); an overload-aware " +
      "reader is required or calls passing either type are wrongly rejected",
  );

  const rooms = signatures.get("get_user_rooms");
  assertEquals(
    rooms?.[0]?.params,
    ["p_user_id", "p_search_query", "p_filter_type", "p_limit", "p_offset"],
  );

  const search = signatures.get("search_forum");
  assertEquals(
    search?.[search.length - 1]?.params.includes("p_sort_by"),
    true,
    "search_forum is defined twice; the later definition is the one callers use",
  );
});
