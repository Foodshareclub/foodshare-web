/**
 * Internal service authentication for non-user-facing edge endpoints.
 *
 * Mirrors the job-worker's `require_internal_token`
 * (services/crates/job-worker/src/http.rs): fail-closed when no secret is
 * configured, constant-time comparison of the presented token. The token is
 * accepted as `Authorization: Bearer <token>` (the job-worker convention) or
 * as `X-Internal-Token: <token>` for cron-style callers.
 *
 * The secret is resolved through the Vault (service-role RPC) with an
 * environment fallback — the same resolution order the estate already uses
 * for this secret (see api-v1-notifications/lib/auth.ts, which predates this
 * module and can be migrated to it).
 */

import { getSecret } from "./vault.ts";

const SECRET_NAMES = ["INTERNAL_SERVICE_SECRET", "WEBHOOK_SECRET"];

export type InternalAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; code: string; message: string };

/**
 * Constant-time string comparison. Walks the full length of the longer
 * string with no early exit: timing reveals neither the position of the
 * first mismatch nor the expected length. Out-of-bounds reads normalise to
 * 0; a length difference is folded into the accumulator up front.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const n = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Verify the internal service token on a request.
 *
 * Fails closed: with no secret configured (environment or Vault), every
 * request is rejected with 503 — the same posture as
 * `verifyGoTrueEmailWebhook` — so a deployment that ships the endpoint
 * without the secret produces a loud, diagnosable outage instead of a
 * silently public one. A missing or wrong token is a 401 that never
 * distinguishes "missing" from "wrong" in its message.
 */
export async function requireInternalToken(
  request: Request,
): Promise<InternalAuthResult> {
  let expected: string | undefined;
  for (const name of SECRET_NAMES) {
    expected = await getSecret(name);
    if (expected) break;
  }

  if (!expected) {
    return {
      ok: false,
      status: 503,
      code: "INTERNAL_NOT_CONFIGURED",
      message: "Internal service token is not configured",
    };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (request.headers.get("x-internal-token") ?? "").trim();

  if (!presented || !constantTimeEqual(presented, expected)) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid internal service token",
    };
  }

  return { ok: true };
}
