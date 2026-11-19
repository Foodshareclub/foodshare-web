/**
 * iOS DeviceCheck verification handlers.
 *
 * Used for older iOS devices that do not support App Attest.
 *
 * ## Why this never reports `verified: true`
 *
 * DeviceCheck is an *opaque one-time token*: `DCDevice.generateToken()`
 * returns bytes that mean nothing until Apple's own server says so. There
 * is no signature to check locally, no certificate chain to walk, and no
 * field to compare against anything the caller sent. The only correct
 * implementation is a round trip to `api.devicecheck.apple.com/v1/...`
 * authenticated with this application's private key, which is not held
 * here.
 *
 * The previous implementation did something far worse than doing nothing:
 * it accepted any base64 string of at least 50 characters and returned
 * `verified: true, trustLevel: "trusted"`. Because the request type is
 * chosen by the client, that was a self-service bypass of the entire
 * attestation gate — `{"type":"device_check","token":"<any 50 bytes>"}`
 * bought a trusted device record. Shape checks are retained below only so
 * a client can tell a malformed token from a well-formed one that Apple
 * was never asked about; neither outcome is ever trusted.
 *
 * To implement this properly, add the Apple DeviceCheck private key to
 * Vault, call Apple's `validate_proof`, and pin the response handling the
 * same way the App Attest path is handled.
 *
 * @module api-v1-attestation/lib/device-check
 */

import { logger } from "../../_shared/logger.ts";
import type { TrustLevel } from "./types.ts";

// =============================================================================
// DeviceCheck Verification
// =============================================================================

/**
 * Inspect a DeviceCheck token.
 *
 * Always returns `verified: false` until server-side validation against
 * Apple exists. Callers must treat this as an unattested device.
 *
 * @param token - The opaque token from `DCDevice.generateToken()`.
 * @returns A verdict that never grants trust.
 */
export async function verifyDeviceCheck(
  token: string,
): Promise<{
  verified: boolean;
  trustLevel: TrustLevel;
  message?: string;
  riskScore: number;
}> {
  try {
    // Shape only. None of this establishes provenance.
    if (!token || token.length < 50) {
      return {
        verified: false,
        trustLevel: "unknown",
        message: "Invalid token format",
        riskScore: 100,
      };
    }

    try {
      const tokenData = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
      if (tokenData.length < 50) {
        return {
          verified: false,
          trustLevel: "unknown",
          message: "Token data too short",
          riskScore: 100,
        };
      }
    } catch {
      return {
        verified: false,
        trustLevel: "unknown",
        message: "Invalid token encoding",
        riskScore: 100,
      };
    }

    // Token bytes are deliberately not logged. They are attestation
    // material, and a prefix is still a prefix.
    logger.warn("DeviceCheck token declined: server validation is not configured", {
      tokenLength: token.length,
    });

    return {
      verified: false,
      trustLevel: "unknown",
      message: "DeviceCheck server validation is not configured on this server. " +
        'Use App Attest (`type: "attestation"`) instead.',
      riskScore: 100,
    };
  } catch (error) {
    logger.error(
      "DeviceCheck verification error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      verified: false,
      trustLevel: "unknown",
      message: "Verification failed",
      riskScore: 100,
    };
  }
}
