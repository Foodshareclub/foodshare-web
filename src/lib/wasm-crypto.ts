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

import * as WasmCrypto from "@/wasm/foodshare-crypto/foodshare_crypto";

/**
 * Generate a 6-digit TOTP MFA token from a secret key.
 */
export function generateTotp(secret: string, timestampSeconds?: number): string {
  try {
    const timeBigInt = timestampSeconds ? BigInt(timestampSeconds) : null;
    return WasmCrypto.generate_totp_code(secret, timeBigInt);
  } catch (error) {
    console.error("WASM TOTP generation failed:", error);
    throw error;
  }
}

/**
 * Verify user-entered TOTP token with time-drift window support (±windowSteps).
 */
export function verifyTotp(
  secret: string,
  code: string,
  timestampSeconds?: number,
  windowSteps: number = 1
): boolean {
  try {
    const timeBigInt = timestampSeconds ? BigInt(timestampSeconds) : null;
    const windowBigInt = BigInt(windowSteps);
    return WasmCrypto.verify_totp_code(secret, code, timeBigInt, windowBigInt);
  } catch (error) {
    console.error("WASM TOTP verification error:", error);
    return false;
  }
}

/**
 * Build standard otpauth URI for Google Authenticator / Apple Keychain QR Codes.
 */
export function buildOtpAuthUri(
  accountName: string,
  issuer: string = "FoodShare",
  base32Secret: string
): string {
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
