import { readFileSync, readdirSync, statSync } from "bun:fs";
import { join } from "bun:path";
import { describe, expect, it } from "bun:test";

/**
 * Invariants for `'use cache'` scopes, now that the read layer actually uses one.
 *
 * Before this, the repository had 248 `invalidateTag` calls and a `cacheLife`
 * profile table and **zero** cache entries: no read declared a tag, so every
 * invalidation marked nothing stale and writes never took effect. The reads are
 * cached now, which makes a set of things that fail silently worth asserting.
 *
 * The three failure modes, in order of how quietly they fail:
 *
 *  1. **Request data inside a cached scope.** A `'use cache'` function that
 *     reaches `cookies()` or `headers()` either fails the build or — through the
 *     session-bound Supabase client, which reads cookies — caches one visitor's
 *     response and serves it to the next. That is a cross-account data leak, and
 *     nothing throws.
 *
 *  2. **A varying input that is not in the key.** The key is the build id, a hash
 *     of the function's location, its arguments, and any variable captured from
 *     an enclosing scope. A value read from module scope or a global is in
 *     *none* of those, so a per-request or per-user value picked up that way
 *     caches the first caller's result for everyone.
 *
 *  3. **A cache entry nothing can invalidate.** A read with no `cacheTag` is
 *     write-once for the life of the profile. A read with no `cacheLife` takes
 *     the default profile, which is not what the surrounding code assumes.
 *
 * Plus one build-hygiene rule, stated here because the obvious wording of it
 * is backwards: a cached read that runs at prerender time makes `bun run build`
 * depend on the database — which is how `/api/products` failed with
 * `unknown certificate verification error` — and the tempting fix is to branch
 * on `shouldStubPrerender()` and return a placeholder. That placeholder is what
 * the assertion below forbids, because a prerendered segment is a build
 * artifact and ships to visitors. So a cached read returns real data or throws.
 * A route that must not run at build time opts out the other way, by reading
 * its request (see `src/app/api/products/route.ts`).
 *
 * This is a static check, not a type check, because every one of these
 * mistakes compiles cleanly.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/__tests__/"));

interface CachedScope {
  file: string;
  name: string;
  /** The body of the cached function. */
  body: string;
}

/**
 * A real directive is a statement on its own line. Anchoring on that is what
 * keeps the prose in `src/lib/build-env.ts` — which explains the directive in
 * order to justify stubbing around it — from being counted as a scope.
 */
const DIRECTIVE = /^[ \t]*["']use cache["'];?[ \t]*$/gm;

/**
 * Extract each `'use cache'` scope as a function body.
 *
 * The body brace is found by scanning *backwards* from the directive, tracking
 * brace depth. The obvious approach — `indexOf("{", directiveIndex)` — finds the
 * wrong brace the moment a return type or a local object literal contains one,
 * and it found `PostRatingCounts = {…}` in `getPostRating` and returned a
 * four-character "body". Going backwards from a directive that is the first
 * statement in the function lands exactly on the brace that opened it.
 */
function findCachedScopes(source: string): CachedScope[] {
  const scopes: CachedScope[] = [];

  for (const match of source.matchAll(DIRECTIVE)) {
    const at = (match.index ?? 0) + match[0].length;

    // Backwards: the first `{` reached at depth 0 opens the enclosing body.
    let depth = 0;
    let open = -1;
    for (let i = at - 1; i >= 0; i--) {
      if (source[i] === "}") depth++;
      else if (source[i] === "{") {
        if (depth === 0) {
          open = i;
          break;
        }
        depth--;
      }
    }
    if (open === -1) continue;

    // Forward to the matching close.
    let end = open;
    depth = 0;
    for (; end < source.length; end++) {
      if (source[end] === "{") depth++;
      else if (source[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }

    // The signature, for a useful failure message.
    const signatureStart = source.lastIndexOf("function", open);
    const signature = signatureStart === -1 ? "" : source.slice(signatureStart, open);
    const name = /function\s+(\w+)/.exec(signature)?.[1] ?? "<anonymous>";

    scopes.push({ file: "", name, body: source.slice(open, end + 1) });
  }

  return scopes;
}

const allScopes: CachedScope[] = sourceFiles.flatMap((file) =>
  findCachedScopes(readFileSync(file, "utf8")).map((scope) => ({
    ...scope,
    file: file.replace(`${process.cwd()}/`, ""),
  })),
);

describe("'use cache' invariants", () => {
  it("finds the cached scopes (a parser regression would make the rest vacuous)", () => {
    expect(allScopes.length).toBeGreaterThanOrEqual(8);
  });

  it("no cached scope can reach request data", () => {
    const offenders: string[] = [];

    for (const scope of allScopes) {
      // Direct request APIs.
      if (/\bcookies\s*\(|\bheaders\s*\(|\bdraftMode\s*\(/.test(scope.body)) {
        offenders.push(`${scope.file} → ${scope.name}: reads request data directly`);
        continue;
      }

      // The indirect version, which is the one that actually bites: the
      // session-bound Supabase client reads cookies to build itself, so calling
      // it inside a cached scope caches one visitor's response for the next.
      if (/\bcreateClient\s*\(/.test(scope.body) || /\bgetAuthSession\s*\(/.test(scope.body)) {
        offenders.push(`${scope.file} → ${scope.name}: uses the session-bound client inside a cached scope`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("every cached scope declares a cacheTag, so writes can invalidate it", () => {
    const offenders = allScopes
      .filter((scope) => !/cacheTag\s*\(/.test(scope.body))
      .map((scope) => `${scope.file} → ${scope.name}`);

    expect(offenders).toEqual([]);
  });

  it("every cached scope declares a cacheLife", () => {
    const offenders = allScopes
      .filter((scope) => !/cacheLife\s*\(/.test(scope.body))
      .map((scope) => `${scope.file} → ${scope.name}`);

    expect(offenders).toEqual([]);
  });

  it("no cached scope substitutes a build-time placeholder", () => {
    // This is the rule the measurement produced, and it is the opposite of the
    // obvious one. An earlier version of this work guarded every cached read
    // with `shouldStubPrerender()` so the build would not need the database. It
    // shipped a page that showed nobody's listings, and every gate was green.
    //
    // What happened, in order:
    //
    //   1. The guard returned a placeholder during the build.
    //   2. The prerendered `__PAGE__` segment captured it: `"children":"[]"`,
    //      with a one-hour revalidate window.
    //   3. A production server served that segment. Verified, not assumed —
    //      a `next start` on the built image answered `[]`.
    //
    // The reason is that a prerendered segment is a build artifact, not a cache
    // entry: the build ID being part of the `'use cache'` key protects the cache
    // and not the shell. And `NEXT_PHASE` cannot rescue it either, because Next
    // inlines it into the *server* bundle, so the guard was `true` at runtime
    // too — see src/lib/build-env.ts.
    //
    // So: a cached read must return real data or throw. There is no third
    // option, and this is the assertion that stops it coming back.
    const offenders = allScopes
      .filter((scope) => /shouldStubPrerender\s*\(/.test(scope.body))
      .map((scope) => `${scope.file} → ${scope.name}`);

    expect(offenders).toEqual([]);
  });

  it("shouldStubPrerender does not test NEXT_PHASE", () => {
    // Next inlines `process.env.NEXT_PHASE` into the server bundle, so a helper
    // testing it is `true` in production for the life of the deployment. It
    // looks like a build-time check and is not one.
    const source = readFileSync(join(SRC, "lib", "build-env.ts"), "utf8");
    const body = source.slice(source.indexOf("export function shouldStubPrerender"));
    expect(body).not.toMatch(/NEXT_PHASE/);
  });

  it("cached scopes in the data layer read the cookie-less client", () => {
    // Belt and braces on the leak above, stated positively: the data layer is
    // where a public read belongs, and `createCachedClient` is the only client
    // that is safe inside a cache.
    const dataLayer = allScopes.filter((scope) => scope.file.startsWith("src/lib/data/"));
    expect(dataLayer.length).toBeGreaterThanOrEqual(8);

    for (const scope of dataLayer) {
      expect({
        fn: `${scope.file} → ${scope.name}`,
        usesAnonClient: /createCachedClient\s*\(/.test(scope.body),
      }).toEqual({ fn: `${scope.file} → ${scope.name}`, usesAnonClient: true });
    }
  });

  it("no file still uses the removed revalidateTag-into-void pattern", () => {
    // revalidateTag() only invalidates entries created by cacheTag() or
    // unstable_cache. With no tagged entries it is a no-op that reads as though
    // it were doing something — which is the state this file was written to end.
    const suspicious = sourceFiles
      .filter((f) => {
        const source = readFileSync(f, "utf8");
        return source.includes("revalidateTag(") && !source.includes("cacheTag(") && !source.includes('"use cache"');
      })
      .map((f) => f.replace(`${process.cwd()}/`, ""));

    expect(suspicious).toEqual([]);
  });

  it("createCachedClient documents the caching hazard", () => {
    const source = readFileSync(join(SRC, "lib", "supabase", "server.ts"), "utf8");
    // Easy to reintroduce by "fixing" the misleading name, so the warning has to
    // stay attached to the definition.
    expect(source).toMatch(/unstable_cache[\s\S]{0,200}?cross-account data leak/);
  });
});
