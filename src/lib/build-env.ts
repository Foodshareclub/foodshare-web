/**
 * Build-environment helpers — modularized from inline `process.env` checks.
 *
 * Centralizes the "are we in a stubbed CI/build prerender?" decision so
 * `generateStaticParams` and other build-time data functions skip live
 * network calls deterministically instead of each duplicating env logic.
 *
 * Usage:
 * ```ts
 * import { shouldStubPrerender } from "@/lib/build-env";
 * export async function generateStaticParams() {
 *   if (shouldStubPrerender()) return [];
 *   ...
 * }
 * ```
 */

/** True when build-time data fetching must be stubbed (no live Supabase). */
export function shouldStubPrerender(): boolean {
  return (
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NEXT_PHASE === "phase-production-build"
  );
}
