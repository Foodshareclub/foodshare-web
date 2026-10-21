/**
 * Read `deno check`'s diagnostics as data.
 *
 * `deno check` prints prose: a code, a sentence, a caret line, an `at file:line`
 * and often several screens of "Overload 1 of 2, ... gave the following error"
 * before the thing that matters. None of that is comparable across runs, and a
 * baseline built from it would churn on every line that moved.
 *
 * So this reduces a run to `file | code | message` with a count, and drops the
 * line number on purpose. A line number in a baseline is a maintenance tax
 * paid on every unrelated edit above it, and it records position rather than
 * content — the thing worth pinning is "this property does not exist on this
 * row", not that it was on line 81.
 *
 * Two things are filtered out and both are deliberate:
 *
 *   * The `Overload N of M` lines. supabase-js's `from()` is overloaded over
 *     ~200 relation names, so one bad relation produces several near-identical
 *     overload diagnostics. Counting them makes the debt number a function of
 *     how the library is written rather than of how many defects there are.
 *   * Multi-line message continuations. A message is the text up to the
 *     `at file:` line, joined, whitespace-collapsed.
 */

import { walkTypeScript } from "./scan.ts";

const FUNCTIONS_DIR = new URL("../../", import.meta.url);

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
 * Not just the `index.ts` files. The first version checked the 30 function
 * entry points, which is the surface a *deployment* exercises, and the budget
 * it wrote passed on 122 errors - while the test task failed with 28 more,
 * because `deno test` type-checks every test file and everything it imports,
 * and files like `_shared/rate-limiter.ts` and
 * `telegram-bot-foodshare/handlers/auth.ts` are reached from there but from no
 * entry point. A budget that does not cover the surface that runs in CI is
 * worse than no budget: it reports green for a build that is red.
 *
 * So the set is every TypeScript file, tests included. That also means the
 * test files are type-checked by this run, which matters once the test task
 * itself stops type-checking (see `deno.json`) — the checking is not lost, it
 * is moved to where it can be budgeted.
 */
export function entryPoints(): string[] {
  // `walkTypeScript` skips `__tests__`, which is correct for the audits — a
  // call site inside a test fixture is a fixture, not a query — and wrong for
  // the type checker, because the tests are exactly what the task with
  // `--no-check` no longer checks. Both halves are added here.
  return [
    ...walkTypeScript(FUNCTIONS_DIR),
    ...walkTypeScript(new URL("__tests__/", FUNCTIONS_DIR), "__tests__/"),
  ].sort();
}

/** Run `deno check` over every entry point and return its raw output. */
export async function runCheck(): Promise<string> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      "--no-lock",
      ...entryPoints(),
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  // Stripped before anything is matched, not after. Deno colours the space
  // between the code and `[ERROR]` -- the bytes are
  // `TS2769 \x1b[0m[ERROR]:` -- so `TS2769 [ERROR]` does not occur in the raw
  // output and a regex for it finds nothing. Combined with the fact that all of
  // `deno check`'s output goes to stderr, the first version of this concluded
  // that a run reporting 122 errors had reported none, and would have written an
  // empty baseline.
  const all = (new TextDecoder().decode(stdout) + new TextDecoder().decode(stderr))
    .replace(ANSI, "");

  // A non-zero exit with diagnostics is the expected case, not a failure of the
  // command: `deno check` exits non-zero whenever it reports anything, and the
  // whole point is to have something to report.
  if (code !== 0 && !/TS\d+ \[ERROR\]/.test(all)) {
    throw new Error(
      `deno check exited ${code} without reporting a type error.\n\n` +
        "That means the checker itself failed — an unknown flag, a bad path — " +
        "and treating it as 'no errors' is how a baseline silently empties and " +
        "then approves anything.\n\n" +
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

export function parseDiagnostics(raw: string): DiagnosticCount[] {
  const text = raw.replace(ANSI, "");
  const lines = text.split("\n");

  const found: Diagnostic[] = [];
  for (let i = 0; i < lines.length; i++) {
    const head = /^TS(\d+) \[ERROR\]: (.*)$/.exec(lines[i]);
    if (!head) continue;

    const code = `TS${head[1]}`;
    const parts: string[] = [head[2].trim()];

    // The caret line and any continuation belong to the message.
    // The window is 40 lines, not 6. A long message — a `Partial<Profile>`
    // against 47 optional properties is several screens — pushes the
    // `at file:` line far past a short lookahead, and the first version cut the
    // window at 6 and wrote 22 of the 122 baseline entries as `<unlocated>`: a
    // budget line that names no file, which is not a place anyone can fix.
    let file: string | null = null;
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const at = /at file:\/\/(\S+?):(\d+):(\d+)/.exec(lines[j]);
      if (at) {
        file = at[1].split("/supabase/functions/")[1] ?? at[1];
        break;
      }
      // A second diagnostic starts here: this one had no location, which means
      // it came from a nested module and there is nothing to attribute it to.
      if (/^TS\d+ \[ERROR\]:/.test(lines[j])) break;
      const t = lines[j].trim();
      if (t !== "" && !t.startsWith("~") && !t.startsWith("^")) parts.push(t);
    }

    if (file === null) file = "<unlocated>";
    found.push({
      file,
      code,
      message: parts.join(" ").replace(/\s+/g, " ").trim(),
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
        _comment: "Known type errors in supabase/functions, produced by `deno check` " +
          "over every function entry point. `__tests__/typecheck-baseline.test.ts` " +
          "fails if an error appears that is not here, and fails if one here no " +
          "longer occurs, so this file can only shrink.",
        errors: diags,
      },
      null,
      2,
    )
  }\n`;
}
