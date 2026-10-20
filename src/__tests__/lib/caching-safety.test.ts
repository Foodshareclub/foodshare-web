import { readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";
import { describe, expect, it } from "bun:test";

/**
 * Guards the cross-account data-leak trap described on `createCachedClient`.
 *
 * `unstable_cache` keys on a function's arguments, not on the caller. A
 * per-user query built on the cookie-less (anon) client, wrapped in
 * `unstable_cache` without threading the user id into the key, serves the first
 * caller's rows to everyone. That is a silent, high-severity failure — nothing
 * throws, and the data simply belongs to the wrong person.
 *
 * The cache layer is currently unused, so this is a ratchet: it fails the moment
 * someone wraps a per-user anon-client query in `unstable_cache`, which is
 * exactly the moment a review is least likely to catch it.
 */

const SRC = join(process.cwd(), "src");

/** Per-user data functions that read another user's rows through the anon client. */
const PER_USER_ANON_FUNCTIONS = [
  "getUserProducts",
  "getUserChallenges",
  "getUserStats",
  "getProfile",
  "getPublicProfile",
  "getProfileReviews",
  "hasUserReportedPost",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/__tests__/"));

describe("caching safety", () => {
  it("no per-user anon-client function is wrapped in unstable_cache", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles) {
      const source = readFileSync(file, "utf8");

      // Only flag files that both import unstable_cache and use the anon
      // client, so unrelated files do not produce noise.
      if (!source.includes("unstable_cache")) continue;
      if (!source.includes("createCachedClient")) continue;

      // Find every unstable_cache(...) call and check whether a per-user query
      // is referenced inside it or assigned from it. Matching on a fixed
      // character window is not sufficient: the wrapped body is routinely longer
      // than any sane bound, and a too-small window silently passes.
      for (const call of source.matchAll(/unstable_cache\(/g)) {
        const start = call.index!;
        // Walk to the matching close paren, respecting nesting, so nested calls
        // do not truncate the region we inspect.
        let depth = 0;
        let end = start;
        for (; end < source.length; end++) {
          const ch = source[end];
          if (ch === "(") depth++;
          else if (ch === ")") {
            depth--;
            if (depth === 0) break;
          }
        }
        const body = source.slice(start, end + 1);

        // Two ways the leak shows up:
        //   1. the per-user query is referenced inside the cached call, or
        //   2. the cached result is assigned to that exported name —
        //      `export const getUserChallenges = unstable_cache(async (userId) => …)`,
        //      where the inner function is usually renamed and the per-user name
        //      appears only at the assignment.
        const assigned = source
          .slice(0, start)
          .match(/(?:const|let|var|function)\s+(\w+)\s*=\s*$|[;}]\s*(\w+)\s*=\s*$/);
        const exportedName = assigned?.[1] ?? assigned?.[2];

        const named =
          PER_USER_ANON_FUNCTIONS.includes(exportedName ?? "") ||
          PER_USER_ANON_FUNCTIONS.some((fn) => new RegExp(`\\b${fn}\\b`).test(body));

        if (named) {
          const which = PER_USER_ANON_FUNCTIONS.includes(exportedName ?? "")
            ? exportedName!
            : PER_USER_ANON_FUNCTIONS.find((fn) => new RegExp(`\\b${fn}\\b`).test(body))!;
          offenders.push(`${file.replace(`${process.cwd()}/`, "")} → ${which}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("createCachedClient documents the caching hazard", () => {
    const source = readFileSync(join(SRC, "lib", "supabase", "server.ts"), "utf8");
    // The hazard is easy to reintroduce by "fixing" the misleading name, so the
    // warning has to stay attached to the definition.
    expect(source).toMatch(/unstable_cache[\s\S]{0,200}?cross-account data leak/);
  });

  it("no file still uses the removed revalidateTag-into-void pattern", () => {
    // revalidateTag() only invalidates entries created by cacheTag()/unstable_cache.
    // With no cache entries there is nothing to invalidate, so a bare call is a
    // no-op that reads as if it were doing something.
    const suspicious = sourceFiles
      .filter((f) => {
        const source = readFileSync(f, "utf8");
        return (
          source.includes("revalidateTag(") && !source.includes("cacheTag(") && !source.includes("unstable_cache(")
        );
      })
      .map((f) => f.replace(`${process.cwd()}/`, ""));

    expect(suspicious).toEqual([]);
  });
});
