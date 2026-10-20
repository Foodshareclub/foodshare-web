/**
 * Walking the edge functions on disk.
 *
 * The four schema audits all need the same file list, and each had its own
 * copy. The copies had drifted: one skipped `__tests__` and one did not, so the
 * set of files an audit read depended on which file you were in — and an audit
 * that reads the audit's own source will report the test fixtures' relations as
 * if they were production call sites.
 *
 * This is the single definition, and `deno test` picks it up as a test module
 * so the walk itself is covered rather than assumed.
 */

const FUNCTIONS_DIR = new URL("../../", import.meta.url);

/** Directories that are not edge function source. */
const SKIP = new Set(["node_modules", "__tests__", "vendor", ".git"]);

/** The functions directory, for tests that want to pass somewhere else. */
export { FUNCTIONS_DIR };

/**
 * Every `.ts` file under the functions, as repo-relative paths.
 *
 * Sorted, because an audit that reports findings in directory order produces a
 * different diff when the filesystem does. `__tests__` is skipped: a test
 * fixture's `.from("...")` is not a call site, and including them would let a
 * test assert something about a relation that no code actually uses.
 */
export function walkTypeScript(
  dir: URL = FUNCTIONS_DIR,
  prefix = "",
): string[] {
  const out: string[] = [];
  for (const entry of Deno.readDirSync(dir)) {
    if (entry.isDirectory) {
      if (SKIP.has(entry.name)) continue;
      out.push(
        ...walkTypeScript(
          new URL(`${entry.name}/`, dir),
          `${prefix}${entry.name}/`,
        ),
      );
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      out.push(`${prefix}${entry.name}`);
    }
  }
  return out.sort();
}
