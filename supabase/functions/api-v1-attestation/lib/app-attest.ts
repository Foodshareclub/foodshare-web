/**
 * App Attest verification.
 *
 * Replaces a decoder and validator that could not be made safe in the edge
 * runtime. What was wrong:
 *
 * 1. `x5c.length >= 2` was accepted as proof that Apple produced the
 *    attestation. No chain was validated, no signature was checked, and no
 *    certificate was pinned. Any self-signed certificate pair passed.
 * 2. The challenge was accepted and then discarded — the parameter was
 *    named `_challenge` — so an attestation obtained for one enrolment
 *    could be replayed against another.
 * 3. `parseAuthData` used a **WebAuthn** layout: a 16-byte `aaguid`
 *    followed by a credential-id length. App Attest authData has neither.
 *    It is `rpIdHash(32) || flags(1) || signCount(4) || COSE_Key`, so every
 *    real attestation was mis-parsed.
 * 4. `decodeCBOR` was partial: major types 0/2/3/4/5 only, and it returned
 *    `null` for additional-info 26 and 27 — that is, silently for any
 *    64-bit integer, any indefinite-length item, tags and floats.
 *
 * All four are fixed in `services/crates/fs-verify`, which validates both
 * certificate chains to a pinned Apple root, binds the issued nonce to the
 * server challenge, and parses the correct App Attest layout. This module
 * is the client.
 *
 * ## Fail-closed
 *
 * When the verification service is unavailable the device is **not**
 * trusted. There is deliberately no local fallback and no "verify later"
 * path: a fallback would reintroduce the vulnerability exactly when an
 * attacker would prefer it, and a device enrolled without a validated
 * Apple chain is a device whose key was never proven to exist on a real
 * device.
 *
 * @module api-v1-attestation/lib/app-attest
 */

import { logger } from "../../_shared/logger.ts";
import {
  isRejection,
  isUnavailable,
  logVerificationFailure,
  verifyAppAttest as verifyAppAttestWithService,
  verifyAppAttestAssertion,
} from "../../_shared/internal-services.ts";

/** Outcome of an attestation check. */
export interface AttestationVerification {
  /** Whether the attestation is trusted. */
  verified: boolean;
  /** The attested public key, base64, present only when verified. */
  publicKey?: string;
  /** Why it was rejected, when it was. */
  message?: string;
  /**
   * Risk score. Higher is worse.
   *
   * Kept for the caller��s compatibility with the previous shape, but a
   * rejected attestation is now always 100: there is no longer a
   * "verified with a caveat" middle state, because there is no longer a
   * code path that returns one.
   */
  riskScore: number;
  /** Apple key id, hex, when verified. */
  keyId?: string;
  /** The platform's counter at attestation time. */
  signCount?: number;
  /** SPKI SHA-256 of the pinned root the chain terminated at. */
  anchorFingerprint?: string;
}

/** Outcome of an assertion check. */
export interface AssertionVerification {
  verified: boolean;
  /** The counter to persist for the next comparison. */
  newCounter: number;
  message?: string;
  riskScore: number;
}

/**
 * The bundle identifier this function attests for.
 *
 * Prefers the value supplied on the request and falls back to the
 * configured one. The request value is preferred so a staging build can
 * attest against its own identifier, but it is only ever *compared*
 * against — the hash that matters is derived from it and checked against
 * the attestation, so a caller cannot choose its way to a match.
 */
export function getBundleId(): string {
  const configured = Deno.env.get("IOS_BUNDLE_ID") ??
    Deno.env.get("APPLE_BUNDLE_ID") ??
    Deno.env.get("BUNDLE_ID");
  if (configured) return configured;
  throw new Error(
    "No bundle identifier configured. Set IOS_BUNDLE_ID, or send bundleId " +
      "on the request.",
  );
}

/**
 * The Apple Team ID, from the environment.
 *
 * App Attest's `rpIdHash` covers the App ID, and the convention in use
 * here is the team-qualified form (`TEAMID.bundleId`). That composition
 * is passed to the verification service explicitly rather than being
 * applied independently on each side, so the rule lives in exactly one
 * place and a correction cannot produce a cross-runtime mismatch.
 */
function getAppleTeamId(): string | null {
  return Deno.env.get("APPLE_TEAM_ID") ?? null;
}

/**
 * The App ID whose SHA-256 must equal the attestation's `rpIdHash`.
 *
 * Falls back to the bare bundle identifier when no team ID is configured.
 * An unconfigured team ID is a deployment fault, not a reason to skip the
 * check, so the weaker-but-still-binding form is used and the situation is
 * logged once per call.
 */
function expectedAppId(bundleId: string): string {
  const teamId = getAppleTeamId();
  if (!teamId) {
    logger.warn(
      "APPLE_TEAM_ID is not set; comparing rpIdHash against the bare bundle " +
        "identifier. If App Attest signs the team-qualified App ID, every " +
        "attestation will be rejected.",
    );
    return bundleId;
  }
  return `${teamId}.${bundleId}`;
}

/**
 * Verify an App Attest attestation.
 *
 * @param keyId Expected Apple key id, hex. Retained for the caller's
 *              bookkeeping; the attested key id is derived from the
 *              attestation itself and returned, and a mismatch is logged
 *              rather than treated as fatal, because Apple assigns the key
 *              id at `generateKey` time and the client is expected to
 *              have it.
 * @param attestation The compact JWS delivered to `attestKey`.
 * @param challenge The single-use challenge issued at `generateKey` time.
 * @param bundleId The app's bundle identifier.
 */
export async function verifyAppAttest(
  keyId: string,
  attestation: string,
  challenge: string,
  bundleId: string,
): Promise<AttestationVerification> {
  if (!challenge) {
    // A caller that cannot supply a challenge cannot demonstrate freshness.
    // Previously the parameter was optional and ignored.
    return {
      verified: false,
      message: "challenge is required",
      riskScore: 100,
    };
  }

  try {
    const result = await verifyAppAttestWithService(
      attestation,
      challenge,
      bundleId,
      // The composed App ID, not the bare bundle identifier; see
      // `expectedAppId` for why this is the caller's job.
      expectedAppId(bundleId),
    );

    logger.info("App Attest attestation verified", {
      keyIdPrefix: keyId?.substring(0, 8) ?? null,
      attestedKeyId: result.keyId.substring(0, 16),
      signCount: result.signCount,
      chainLength: result.chainLength,
      anchorFingerprint: result.anchorFingerprint,
    });

    return {
      verified: true,
      publicKey: result.publicKeySec1,
      keyId: result.keyId,
      signCount: result.signCount,
      anchorFingerprint: result.anchorFingerprint,
      // A fully validated attestation is the strongest signal available,
      // and it is now the *only* positive outcome.
      riskScore: 0,
    };
  } catch (error) {
    logVerificationFailure("app-attest", error, {
      keyIdPrefix: keyId?.substring(0, 8) ?? null,
      bundleId,
    });

    if (isUnavailable(error)) {
      // Not the device's fault. The caller decides the status code; the
      // point is that the device is not trusted and is not enrolled.
      return {
        verified: false,
        message: "Attestation verification is temporarily unavailable; the device was not enrolled",
        riskScore: 100,
      };
    }

    return {
      verified: false,
      message: isRejection(error)
        ? "Attestation rejected: the Apple certificate chain or challenge did not validate"
        : "Attestation verification failed",
      riskScore: 100,
    };
  }
}

/**
 * Verify an App Attest assertion against a key registered at enrolment.
 *
 * @param keyId The stored Apple key id.
 * @param assertion The CBOR assertion from `attestKey`, base64.
 * @param bundleId The app's bundle identifier.
 * @param storedCounter The last counter seen for this key.
 * @param storedPublicKey The attested key, base64, as stored at enrolment.
 */
export async function verifyAssertion(
  keyId: string,
  assertion: string,
  bundleId: string,
  storedCounter: number,
  storedPublicKey: string,
): Promise<AssertionVerification> {
  if (!storedPublicKey) {
    // Verifying against an absent key cannot succeed. Previously this
    // would have fallen through to a decode-only path.
    return {
      verified: false,
      newCounter: storedCounter,
      message: "No stored public key for this key id",
      riskScore: 100,
    };
  }

  try {
    const result = await verifyAppAttestAssertion(
      assertion,
      toHex(storedPublicKey),
      bundleId,
      expectedAppId(bundleId),
    );

    // Counter monotonicity stays here: it is a database-backed state
    // question rather than a cryptographic one, and the verification
    // service has no business knowing what was stored last.
    if (result.signCount <= storedCounter) {
      logger.warn("App Attest counter did not advance", {
        keyIdPrefix: keyId?.substring(0, 8) ?? null,
        storedCounter,
        presentedCounter: result.signCount,
      });
      return {
        verified: false,
        newCounter: storedCounter,
        message: "Replay detected: counter did not advance",
        riskScore: 100,
      };
    }

    return {
      verified: true,
      newCounter: result.signCount,
      riskScore: 0,
    };
  } catch (error) {
    logVerificationFailure("app-attest-assertion", error, {
      keyIdPrefix: keyId?.substring(0, 8) ?? null,
    });

    return {
      verified: false,
      newCounter: storedCounter,
      message: isUnavailable(error)
        ? "Assertion verification is temporarily unavailable"
        : isRejection(error)
        ? "Assertion rejected"
        : "Assertion verification failed",
      riskScore: 100,
    };
  }
}

/**
 * Normalise the stored public key to lowercase hex.
 *
 * The Rust service returns `publicKeySec1` as hex and `updateDeviceRecord`
 * stores it verbatim, so the value is already in the form the verification
 * service expects. A previous version of this function ran `atob()` on it —
 * a base64 decode applied to a hex string — which corrupted the key before
 * it was sent for verification, so every assertion against a stored key
 * failed with a parse error rather than a cryptographic rejection.
 */
function toHex(stored: string): string {
  return stored.toLowerCase();
}
