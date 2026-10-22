/**
 * Read the type checker's diagnostics as data.
 *
 * The checker is `tsrs`, the one type checker this repository uses. Its
 * output is a line per diagnostic:
 *
 *     path/to/file.ts(12,5): error TS2339: Property 'x' does not exist.
 *
 * and a message that runs on is indented under its diagnostic. That is
 * easier to read than the prose it replaced, and it is the same shape
 * for every diagnostic, so a run reduces to `file | code | message` with
 * a count.
 *
 * The line number is dropped on purpose. A line number in a baseline is
 * a maintenance tax paid on every unrelated edit above it, and it records
 * position rather than content -- the thing worth pinning is "this
 * property does not exist on this row", not that it was on line 81.
 *
 * Two things are filtered out and both are deliberate:
 *
 *   * The union of relation or function names the checker prints inside
 *     the message. `supabase-js` types `from()` over every relation, so
 *     one bad relation is reported against a union of two hundred string
 *     literals, and the checker prints the union in the order it holds
 *     the members. The order is the same on every run -- the type it
 *     comes from is generated -- but it is not the order the members are
 *     written in, so the union is collapsed to a marker before the
 *     message is stored. See `UNION` below.
 *
 * And one thing is collapsed, for a different reason: the identical
 * diagnostics. `supabase-js`'s `from()` is overloaded over every
 * relation, so one bad name yields one diagnostic per overload, and
 * counting them makes the debt number a function of how the library is
 * written rather than of how many defects there are.
 */

import { walkTypeScript } from "./scan.ts";

const FUNCTIONS_DIR = new URL("../../", import.meta.url);
/** The repository's root: the checker's tsconfig and its binary live there. */
const REPO_ROOT = new URL("../../../../", import.meta.url);

export interface Diagnostic {
  file: string;
  code: string;
  message: string;
}

export interface DiagnosticCount extends Diagnostic {
  count: number;
}

/**
 * Every file the check covers.
 *
 * Not just the `index.ts` files. The first version checked the 30
 * function entry points, which is the surface a *deployment* exercises,
 * and the budget it wrote passed on 122 errors - while the test task
 * failed with 28 more, because `deno test` type-checks every test file
 * and everything it imports, and files like `_shared/rate-limiter.ts` and
 * `telegram-bot-foodshare/handlers/auth.ts` are reached from there but
 * from no entry point. A budget that does not cover the surface that
 * runs in CI is worse than no budget: it reports green for a build that
 * is red.
 *
 * So the set is every TypeScript file, tests included. That also means
 * the test files are type-checked by this run, which matters once the
 * test task itself stops type-checking (see `deno.json`) — the checking
 * is not lost, it is moved to where it can be budgeted.
 */
export function entryPoints(): string[] {
  // `walkTypeScript` skips `__tests__`, which is correct for the audits —
  // a call site inside a test fixture is a fixture, not a query — and
  // wrong for the type checker, because the tests are exactly what the
  // task with `--no-check` no longer checks. Both halves are added here.
  return [
    ...walkTypeScript(FUNCTIONS_DIR),
    ...walkTypeScript(new URL("__tests__/", FUNCTIONS_DIR), "__tests__/"),
  ].sort();
}

/**
 * Run the type checker over every file and return its raw output.
 *
 * The checker's modules are the ones the import map names, and they are
 * materialised into `node_modules` by `deno install` -- a fresh checkout
 * has none, and a checker that cannot resolve `hono` reports a file's
 * whole import graph as errors, which is a baseline of noise rather than
 * of debt.
 */
export async function runCheck(): Promise<string> {
  const functionsDir = new URL("../../", import.meta.url).pathname;

  // The dependencies first. `deno install` reads the import map and
  // creates the `node_modules` the checker resolves against; it is
  // idempotent, and it is the only thing that puts a fresh checkout's
  // dependencies in place.
  const install = new Deno.Command(Deno.execPath(), {
    args: ["install", "--quiet"],
    cwd: functionsDir,
    stdout: "piped",
    stderr: "piped",
  });
  const installed = await install.output();
  if (!installed.success) {
    throw new Error(
      `deno install failed, so the type checker could not resolve the estate's dependencies.\n\n` +
        new TextDecoder().decode(installed.stderr).slice(0, 2000),
    );
  }

  const cmd = new Deno.Command("bun", {
    args: ["run", "tsrs", "-p", "supabase/functions/tsconfig.json", "--noEmit"],
    cwd: REPO_ROOT.pathname,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  const all = new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr);

  // A non-zero exit with diagnostics is the expected case, not a failure
  // of the command: the checker exits non-zero whenever it reports
  // anything, and the whole point is to have something to report.
  if (code !== 0 && !/error TS\d+:/.test(all)) {
    throw new Error(
      `the type checker exited ${code} without reporting a type error.\n\n` +
        "That means the checker itself failed — an unknown flag, a bad " +
        "path, a dependency that could not be resolved — and treating it " +
        "as 'no errors' is how a baseline silently empties and then " +
        "approves anything.\n\n" +
        all.slice(0, 2000),
    );
  }
  return all;
}

// Built from `charCodeAt` rather than written as a regex literal: a control
// character in a pattern trips `no-control-regex`, and the alternative is a
// suppression comment for something that is entirely deliberate. Constructing
// it says the same thing without the lint having to be told.
const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");

/**
 * A union of string literals, as the checker renders it.
 *
 * `supabase-js` types `from()` over every relation and `rpc()` over every
 * function, so one bad name is reported against a union of two hundred
 * string literals. The checker prints that union in the order it happens to
 * hold the members, and that order is not the order the members are written
 * in the generated type.
 *
 * The members are the same set every run — only their order and the
 * prefix move — so the union is collapsed to a marker before the message
 * is stored. A budget keyed on the whole message was comparing the
 * checker's rendering rather than the error, and it stopped matching the
 * moment the checker's cache was warm instead of cold: the same command,
 * the same code, green on one machine and red on another.
 *
 * The ellipsis is part of the union: the checker truncates a long union to
 * its first members, `... N more ...`, and its last.
 */
const UNION = new RegExp(
  '(?:"[^"]*"|\\.\\.\\.\\s*\\d+\\s+more\\s*\\.\\.\\.)' +
    '(?:\\s*\\|\\s*(?:"[^"]*"|\\.\\.\\.\\s*\\d+\\s+more\\s*\\.\\.\\.))+',
  "g",
);

export function parseDiagnostics(raw: string): DiagnosticCount[] {
  const text = raw.replace(ANSI, "");
  const lines = text.split("\n");

  const found: Diagnostic[] = [];
  for (let i = 0; i < lines.length; i++) {
    const head = /^([^(\s][^(]*)\(\d+,\d+\): error (TS\d+): (.*)$/.exec(lines[i]);
    if (!head) continue;

    const code = head[2];
    const parts: string[] = [head[3].trim()];

    // The message continues on the indented lines under its diagnostic,
    // and ends at the next one. A diagnostic's own line is not indented,
    // so the indentation is what tells a continuation from the next
    // diagnostic.
    for (let j = i + 1; j < lines.length; j++) {
      if (!/^\s/.test(lines[j])) break;
      const t = lines[j].trim();
      if (t !== "") parts.push(t);
    }

    // The paths are the checker's, which are relative to the repository's
    // root. The baseline's are relative to the functions directory, which
    // is what a reader of a file path there expects.
    const file = head[1].replace(/^supabase\/functions\//, "");
    found.push({
      file,
      code,
      message: parts.join(" ").replace(/\s+/g, " ").replace(UNION, '"…"').trim(),
    });
  }

  // Overload expansion: supabase-js types `from()` over every relation, so one
  // bad name yields one diagnostic per overload. Collapse identical ones.
  const counts = new Map<string, DiagnosticCount>();
  for (const d of found) {
    const k = `${d.file}|${d.code}|${d.message}`;
    const hit = counts.get(k);
    if (hit) hit.count++;
    else counts.set(k, { ...d, count: 1 });
  }

  return [...counts.values()].sort((a, b) =>
    `${a.file}${a.code}${a.message}`.localeCompare(`${b.file}${b.code}${b.message}`)
  );
}

/** The total number of distinct errors, counting overload expansion. */
export function totalErrors(diags: readonly DiagnosticCount[]): number {
  return diags.reduce((n, d) => n + d.count, 0);
}

export function formatBaseline(diags: readonly DiagnosticCount[]): string {
  return `${
    JSON.stringify(
      {
        _comment: "Known type errors in supabase/functions, produced by `tsrs` " +
          "over every TypeScript file. `__tests__/typecheck-baseline.test.ts` " +
          "fails if an error appears that is not here, and fails if one here no " +
          "longer occurs, so this file can only shrink.",
        errors: diags,
      },
      null,
      2,
    )
  }\n`;
}
