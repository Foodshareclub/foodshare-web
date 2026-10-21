/**
 * WebAssembly-Powered Cryptographic & TOTP MFA Engine
 *
 * Direct bridge to `foodshare-crypto` WebAssembly module:
 * - RFC 6238 TOTP token generation & constant-time verification
 * - Timing-safe string comparisons
 * - High-speed HMAC-SHA256 / SHA1 hashing
 *
 * @module lib/wasm-crypto
 */

import { createLogger } from "@/lib/logger";
import * as WasmCrypto from "@/wasm/foodshare-crypto/foodshare_crypto";

const logger = createLogger("WasmCrypto");

/**
 * Convert a number of seconds since the epoch into the whole seconds the
 * module wants.
 *
 * `undefined` means "now", which the module supplies itself. Zero is a
 * real timestamp — the epoch — and is passed through rather than being
 * mistaken for "now". Fractional seconds are floored, because a TOTP
 * counter only ever moves in whole steps.
 *
 * @throws RangeError if the timestamp is negative, which has no counter.
 */
function toEpochSeconds(timestampSeconds: number | undefined): bigint | null {
  if (timestampSeconds === undefined) return null;
  if (!Number.isFinite(timestampSeconds)) {
    throw new RangeError(`timestamp must be a finite number of seconds, got ${timestampSeconds}`);
  }
  const floored = Math.floor(timestampSeconds);
  if (floored < 0) {
    throw new RangeError(`timestamp must not be negative, got ${timestampSeconds}`);
  }
  return BigInt(floored);
}

/**
 * Generate a 6-digit TOTP MFA token from a secret key.
 *
 * @param timestampSeconds Seconds since the epoch. Omit to use the current
 *   time; zero is the epoch itself.
 */
export function generateTotp(secret: string, timestampSeconds?: number): string {
  try {
    return WasmCrypto.generate_totp_code(secret, toEpochSeconds(timestampSeconds));
  } catch (error) {
    logger.error("WASM TOTP generation failed", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Verify user-entered TOTP token with time-drift window support (±windowSteps).
 *
 * A failure to verify and a failure to run the check are reported the
 * same way — as "not verified" — so a broken module cannot be used to
 * distinguish a wrong code from a broken check. The reason is logged.
 */
export function verifyTotp(secret: string, code: string, timestampSeconds?: number, windowSteps = 1): boolean {
  try {
    return WasmCrypto.verify_totp_code(
      secret,
      code,
      toEpochSeconds(timestampSeconds),
      BigInt(Math.floor(windowSteps)),
    );
  } catch (error) {
    logger.error("WASM TOTP verification error", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Build standard otpauth URI for Google Authenticator / Apple Keychain QR Codes.
 */
export function buildOtpAuthUri(accountName: string, base32Secret: string, issuer = "FoodShare"): string {
  return WasmCrypto.build_totp_uri(accountName, issuer, base32Secret);
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  return WasmCrypto.constant_time_eq(a, b);
}

/**
 * Generate HMAC-SHA256 hex signature.
 */
export function hmacSha256(key: string, message: string): string {
  return WasmCrypto.hmac_sha256_hex(key, message);
}
