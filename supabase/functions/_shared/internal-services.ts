/**
 * Client for the internal Rust services.
 *
 * Replaces the in-process Apple verification in Deno, which could not be
 * made correct with the facilities the edge runtime provides — and, in
 * the case of `_shared/subscriptions/apple-jws.ts`, was actively unsafe:
 * the presented root was compared against a pinned Apple root and the
 * result logged, then the verification key was imported from the
 * caller's own leaf certificate. Subscription state was forgeable.
 *
 * ## Fail-closed, with no local fallback
 *
 * When the worker is unreachable this throws. It does NOT fall back to a
 * local verifier. That is the entire point: a fallback to the broken
 * implementation would reintroduce the vulnerability whenever the worker
 * is down, which is exactly when an attacker would prefer it to be. The
 * previous code had the same shape in reverse — an
 * `APPLE_STRICT_VERIFICATION` flag that quietly disabled verification —
 * and it is deliberately not reproduced here.
 *
 * ## Why an internal HTTP hop is acceptable
 *
 * The call crosses `supabase-network`, not the internet: sub-millisecond,
 * and it does not leave the VPS. In exchange, the certificate chain,
 * CBOR and App Attest parsing run in a runtime that can actually do them.
 *
 * ## Circuit breaker
 *
 * Each call site gets its own breaker via `withCircuitBreaker`, matching
 * the pattern already used across the Deno tree. A slow worker must not
 * add its timeout to every webhook.
 *
 * @module
 */

import { logger } from "./logger.ts";
import { withCircuitBreaker } from "./circuit-breaker.ts";

/**
 * Internal service base URL.
 *
 * `functions:9000` is the edge-runtime service on `supabase-network`;
 * `job-worker` is the Rust service. Both are resolvable only from inside
 * the compose network, which is what makes this safe to call without a
 * public route.
 */
const WORKER_BASE_URL = Deno.env.get("WORKER_INTERNAL_URL") ??
  "http://worker:8080";

/** Shared secret. Must match the worker's `INTERNAL_API_TOKEN`. */
function internalToken(): string {
  const token = Deno.env.get("INTERNAL_API_TOKEN");
  if (!token) {
    throw new InternalServiceUnavailableError(
      "internal-services",
      "INTERNAL_API_TOKEN is not set. The verification services cannot be " +
        "called without it, and there is deliberately no local fallback — " +
        "see the module docs for why.",
    );
  }
  return token;
}

/** Outcome of an internal service call. */
type InternalResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

/**
 * Call an internal Rust endpoint.
 *
 * Distinguishes the three cases that matter to a caller, because they
 * need different handling:
 *
 *  - `401` from the worker means the presented material was rejected.
 *    That is a definitive answer and must not be retried.
 *  - `400` means this request is malformed, which is a bug here.
 *  - anything else (5xx, network, timeout) is the worker being
 *    unavailable, which is retryable and is surfaced as a thrown error
 *    so the caller cannot mistake it for a rejection.
 */
async function callInternal<T>(
  path: string,
  body: unknown,
  opts: { timeoutMs?: number } = {},
): Promise<InternalResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${WORKER_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalToken()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // A non-JSON body from our own service is a bug worth surfacing
        // verbatim rather than collapsing into a generic error.
        throw new Error(
          `Internal service ${path} returned a non-JSON body: ${text.slice(0, 200)}`,
        );
      }
    }

    if (response.ok) {
      return { ok: true, data: parsed as T };
    }

    return {
      ok: false,
      status: response.status,
      code: typeof parsed.error === "string" ? parsed.error : "unknown",
      message: typeof parsed.message === "string" ? parsed.message : text.slice(0, 300),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Error thrown when the worker is unreachable or erroring. */
export class InternalServiceUnavailableError extends Error {
  constructor(
    public readonly service: string,
    /** `override`: `Error.cause` is standard since ES2022. */
    public override readonly cause: string,
  ) {
    super(
      `${service} is unavailable (${cause}). Verification has NOT fallen back ` +
        `to a local implementation — doing so would reintroduce the ` +
        `vulnerability this service exists to fix.`,
    );
    this.name = "InternalServiceUnavailableError";
  }
}

/** Error thrown when the worker rejected the presented material. */
export class VerificationRejectedError extends Error {
  constructor(
    public readonly scheme: string,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VerificationRejectedError";
  }
}

/**
 * Split a worker response into a rejection or an unavailability.
 *
 * A 5xx, a 429, or a network failure is unavailability. A 401/400/403 is
 * a decision. Treating a 500 as "rejected" would be just as wrong as
 * treating a 401 as "retry" — it converts a transient outage into either
 * a permanent denial of service or a silent pass.
 */
function classify<T>(
  service: string,
  result: InternalResult<T>,
): T {
  if (result.ok) return result.data;

  // 503 before >= 500: the worker answers 503 when it has no trust anchor
  // configured. That is a deployment fault, not a statement about the
  // caller, and it must never be read as "reject this device". Checking
  // >= 500 first made this branch dead code.
  if (result.status === 503) {
    throw new InternalServiceUnavailableError(
      service,
      result.message,
    );
  }

  if (result.status >= 500 || result.status === 429) {
    throw new InternalServiceUnavailableError(
      service,
      `HTTP ${result.status}: ${result.message}`,
    );
  }

  throw new VerificationRejectedError(service, result.code, result.message);
}

/** Which Apple payload a JWS carries. */
export type AppleJwsKind = "transaction" | "renewal" | "notification";

/** A verified App Store Server API JWS. */
export interface VerifiedAppleJws<T = unknown> {
  /** The decoded payload. */
  payload: T;
  /** SPKI SHA-256 of the pinned root the chain terminated at. */
  anchorFingerprint: string;
}

/**
 * Verify an App Store Server API JWS.
 *
 * The only path to a verified Apple payload. The previous implementation
 * imported the verification key from the attacker-supplied leaf; this one
 * terminates the chain at a pinned Apple root or returns nothing.
 *
 * @param jws Compact JWS as issued by Apple.
 * @param kind Which payload shape the JWS carries.
 */
export async function verifyAppleJws<T = unknown>(
  jws: string,
  kind: AppleJwsKind = "transaction",
): Promise<VerifiedAppleJws<T>> {
  const result = await withCircuitBreaker(
    "worker-verify-apple-jws",
    () =>
      callInternal<{ verified: boolean; payload: T; anchorFingerprint: string }>(
        "/internal/verify/apple-jws",
        { jws, kind },
      ),
    { failureThreshold: 3, resetTimeoutMs: 30_000 },
  );

  return classify<VerifiedAppleJws<T>>("apple-jws verification", result);
}

/** A verified App Attest attestation. */
export interface VerifiedAppAttest {
  /** Apple key id: SHA-256 over the attested COSE_Key. */
  keyId: string;
  /** The attested P-256 public key, SEC1 hex (`0x04 || X || Y`). */
  publicKeySec1: string;
  /** The platform's counter at attestation time. */
  signCount: number;
  /** SPKI SHA-256 of the pinned root the attestation chain ended at. */
  anchorFingerprint: string;
  /** Certificates in the validated chain, leaf first. */
  chainLength: number;
}

/**
 * Verify an App Attest attestation.
 *
 * Replaces `api-v1-attestation/lib/app-attest.ts`, where
 * `x5c.length >= 2` was accepted as proof of Apple provenance and the
 * challenge was accepted then discarded — so an attestation could be
 * replayed against a different enrolment.
 *
 * @param jws The compact JWS delivered to `attestKey`.
 * @param challenge The single-use challenge issued at `generateKey` time.
 * @param bundleId The app's bundle identifier.
 * @param appId The fully composed App ID to hash into `rpIdHash`. Apple's
 *              documentation is ambiguous about whether this is the bare
 *              bundle identifier or the team-qualified form; the caller
 *              composes it so the rule lives in one place rather than
 *              being applied independently on each side.
 */
export async function verifyAppAttest(
  jws: string,
  challenge: string,
  bundleId: string,
  appId?: string,
): Promise<VerifiedAppAttest> {
  const result = await withCircuitBreaker(
    "worker-verify-app-attest",
    () =>
      callInternal<VerifiedAppAttest>(
        "/internal/verify/app-attest",
        appId ? { jws, challenge, bundleId, appId } : { jws, challenge, bundleId },
      ),
    { failureThreshold: 3, resetTimeoutMs: 30_000 },
  );

  return classify<VerifiedAppAttest>("app-attest verification", result);
}

/** A verified App Attest assertion. */
export interface VerifiedAssertion {
  /** The counter from the assertion's authData. */
  signCount: number;
  /** Whether the platform asserted user presence. */
  userPresent: boolean;
}

/**
 * Verify an App Attest assertion against a key registered at enrolment.
 *
 * @param assertionBase64 The CBOR assertion, base64-encoded.
 * @param publicKeySec1Hex The attested key, SEC1 hex, as returned at
 *                         enrolment by {@link verifyAppAttest}.
 * @param bundleId The app's bundle identifier.
 * @param appId Composed App ID; see {@link verifyAppAttest}.
 */
export async function verifyAppAttestAssertion(
  assertionBase64: string,
  publicKeySec1Hex: string,
  bundleId: string,
  appId?: string,
): Promise<VerifiedAssertion> {
  const result = await withCircuitBreaker(
    "worker-verify-app-attest-assertion",
    () =>
      callInternal<VerifiedAssertion>(
        "/internal/verify/app-attest/assertion",
        appId
          ? { assertion: assertionBase64, publicKeySec1: publicKeySec1Hex, bundleId, appId }
          : { assertion: assertionBase64, publicKeySec1: publicKeySec1Hex, bundleId },
      ),
    { failureThreshold: 3, resetTimeoutMs: 30_000 },
  );

  return classify<VerifiedAssertion>("app-attest assertion", result);
}

/**
 * Load the worker's pinned Apple trust anchors.
 *
 * Diagnostic only — this does not participate in verification. It exists
 * so `/health` can report whether the deployment is correctly configured
 * without a restart, and so the `api-v1-health` fleet monitor can show it.
 */
export async function fetchTrustAnchors(): Promise<{
  fingerprints: string[];
  count: number;
  configured: boolean;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${WORKER_BASE_URL}/internal/anchors`, {
      headers: { Authorization: `Bearer ${internalToken()}` },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Base URL, exported for diagnostics. */
export const INTERNAL_SERVICES_BASE_URL = WORKER_BASE_URL;

/**
 * Report whether a verification failure is a rejection or an outage.
 *
 * Callers use this to decide the HTTP status they return. Getting it
 * backwards is harmful in both directions: reporting an outage as a
 * rejection locks out every legitimate user, and reporting a rejection as
 * an outage invites a client to retry a forged payload forever.
 */
export function isRejection(error: unknown): boolean {
  return error instanceof VerificationRejectedError;
}

/** Whether the failure means the worker itself is unavailable. */
export function isUnavailable(error: unknown): boolean {
  return error instanceof InternalServiceUnavailableError;
}

/**
 * Log a verification failure with enough context to act on, and no more.
 *
 * The challenge, the key and the JWS are never logged: a challenge is
 * single-use and logging one turns the logs into a replay store.
 */
export function logVerificationFailure(
  scheme: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const kind = isRejection(error) ? "rejected" : isUnavailable(error) ? "unavailable" : "error";
  const message = error instanceof Error ? error.message : String(error);

  if (kind === "rejected") {
    // A rejection is the expected outcome for a forged or replayed
    // payload, not an operational event. Warn, not error, so a scan
    // probing the endpoint does not page anyone.
    logger.warn("verification rejected", { scheme, kind, message, ...context });
    return;
  }

  if (kind === "unavailable") {
    logger.error("verification service unavailable", {
      scheme,
      kind,
      message,
      ...context,
    });
    return;
  }

  logger.error("verification error", { scheme, kind, message, ...context });
}
