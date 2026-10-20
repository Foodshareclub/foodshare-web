/**
 * Build-environment helpers — modularized from inline `process.env` checks.
 *
 * Centralizes the "are we in a stubbed build?" decision so build-time data
 * functions can skip live network calls deterministically instead of each
 * duplicating env logic.
 *
 * ⚠️ READ THIS BEFORE USING IT IN A REQUEST PATH
 * ────────────────────────────────────────────────────────────────────────────
 * This module used to test `process.env.NEXT_PHASE === "phase-production-build"`
 * alongside an explicit `SKIP_ENV_VALIDATION` opt-in. That second test is a
 * landmine, found by measuring rather than by reading:
 *
 * **Next inlines `NEXT_PHASE` into the server bundle.** After a production
 * build, the emitted server chunks contain the literal
 * `"phase-production-build"===`, so the check is `true` in the running server
 * too — for the life of the deployment. A function guarded this way does not
 * "skip the network during the build"; it returns its placeholder *forever*.
 *
 * A cached read guarded with it served an empty listing to every visitor, from
 * a prerendered segment that had captured the placeholder with a one-hour
 * revalidate window. The build was green, the type checker was green, and the
 * page was wrong.
 *
 * So the phase test is gone. What remains is an explicit, opt-in signal that is
 * read at runtime and is therefore `undefined` in production unless somebody
 * sets it in the image:
 *
 *   - `bun run build` locally: unset, so build-time reads fetch normally.
 *   - CI build job: set to "true", so the build does not need the database.
 *   - The deployed container: never set, so the check is always false at runtime.
 *
 * Only code that runs *during* a build should call this — `generateStaticParams`
 * and prerender-only paths. Nothing reachable from a request may, and
 * `src/__tests__/lib/cache-invariants.test.ts` asserts that a `'use cache'`
 * scope does not.
 */

/**
 * True when build-time data fetching should be stubbed.
 *
 * Build-time only. See the note above: this cannot distinguish "during the
 * build" from "in a server built by that build", so a request path must never
 * branch on it.
 */
export function shouldStubPrerender(): boolean {
  return process.env.SKIP_ENV_VALIDATION === "true";
}
