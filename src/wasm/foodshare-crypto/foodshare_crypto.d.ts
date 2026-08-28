/* tslint:disable */
/* eslint-disable */

/**
 * Generate standard otpauth URI for MFA QR Code generation.
 */
export function build_totp_uri(account_name: string, issuer: string, base32_secret: string): string;

/**
 * Constant-time comparison of two strings.
 */
export function constant_time_eq(a: string, b: string): boolean;

/**
 * Generate a 6-digit TOTP MFA token from raw or base32 secret.
 */
export function generate_totp_code(secret: string, time_seconds?: bigint | null): string;

/**
 * Generate HMAC-SHA1 signature and return as hex string.
 */
export function hmac_sha1_hex(key: string, message: string): string;

/**
 * Generate HMAC-SHA256 signature and return as base64 string.
 */
export function hmac_sha256_base64(key: string, message: string): string;

/**
 * Generate HMAC-SHA256 signature and return as hex string.
 */
export function hmac_sha256_hex(key: string, message: string): string;

/**
 * Verify a user-entered TOTP token with time drift window.
 */
export function verify_totp_code(
  secret: string,
  code: string,
  time_seconds?: bigint | null,
  window_steps?: bigint | null
): boolean;

/**
 * Verify a signature with SHA1 (for legacy providers like GitHub).
 */
export function verify_webhook_sha1(key: string, message: string, signature_hex: string): boolean;

/**
 * Verify a webhook signature (constant-time comparison).
 *
 * # Arguments
 * * `key` - The secret key
 * * `message` - The message/payload
 * * `signature_hex` - The expected signature in hex format
 *
 * # Returns
 * true if signature matches, false otherwise
 */
export function verify_webhook_sha256(key: string, message: string, signature_hex: string): boolean;
