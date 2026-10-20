/**
 * Apple JWS (JSON Web Signature) verification.
 *
 * Apple App Store Server Notifications V2 and the App Store Server API
 * present ES256 JWS with the signing chain in the `x5c` header:
 *
 * - Algorithm: ES256 (ECDSA P-256, SHA-256)
 * - x5c: leaf, intermediate, Apple Root CA
 *
 * @see https://developer.apple.com/documentation/appstoreservernotifications/responsebodyv2
 *
 * ## Why this file no longer verifies anything itself
 *
 * The previous implementation of this module was not merely incomplete —
 * it was forgeable:
 *
 * 1. {@link verifyCertificateChain} compared the presented root against a
 *    pinned Apple root and **logged a warning when the comparison
 *    failed**, then returned the public key imported from the
 *    **caller-supplied leaf certificate**. Any self-signed EC certificate
 *    pair therefore produced a "verified" subscription grant, revocation
 *    or refund.
 * 2. `extractPublicKeyFromCert` located the SubjectPublicKeyInfo by
 *    scanning raw DER for an OID in a `for (i = 0; i < len - 100; i++)`
 *    loop. That is a byte search, not an ASN.1 parse, so it also matches
 *    an OID appearing inside an unrelated extension.
 * 3. `handlers/apple.ts` compounded it: with
 *    `APPLE_STRICT_VERIFICATION=false` the handler fell back to
 *    unverified `decodeJWS` output.
 *
 * None of that is fixable in Deno. Certificate chain validation needs a
 * real ASN.1 parser and a real signature verifier, so the work moved to
 * `services/crates/fs-verify` and this module became a client for it. See
 * `_shared/internal-services.ts` and `docs/rust-migration.md` §2.
 *
 * {@link decodeJWS} is retained and is still used for **non-security**
 * inspection — reading a header field, logging which product a
 * notification concerns. It performs no verification whatsoever and must
 * never be used to decide whether to grant, void or refund anything.
 *
 * @module
 */

import {
  isRejection,
  isUnavailable,
  logVerificationFailure,
  verifyAppleJws,
} from "../internal-services.ts";

// =============================================================================
// Types
// =============================================================================

export interface JWSHeader {
  alg: string;
  x5c?: string[];
  kid?: string;
  typ?: string;
}

export interface DecodedJWS<T> {
  header: JWSHeader;
  payload: T;
  signature: string;
}

// =============================================================================
// Base64URL utilities
// =============================================================================

function base64UrlDecode(input: string): Uint8Array {
  // Convert base64url to base64
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Certificate Chain Validation
// =============================================================================

// =============================================================================
// JWS Verification
// =============================================================================

/**
 * Decode a JWS without verification
 * Use this only for debugging or when you need to inspect the payload before verification
 */
export function decodeJWS<T>(jws: string): DecodedJWS<T> {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as JWSHeader;

  // Decode payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson) as T;

  return {
    header,
    payload,
    signature: signatureB64,
  };
}

/**
 * Verify a JWS from Apple and return the decoded payload
 *
 * @param jws The signed JWS string from Apple
 * @returns The verified and decoded payload
 * @throws Error if verification fails
 */
export async function verifyAppleJWS<T>(jws: string): Promise<T> {
  const { payload } = await verifyAppleJWSWithHeader<T>(jws);
  return payload;
}

/**
 * Verify a JWS and return both header and payload.
 *
 * The payload is only present after the Rust service has confirmed that
 * the chain terminates at a pinned Apple root. The header is returned
 * alongside it for diagnostics; it is not separately trusted, since it
 * came from the same verified envelope.
 */
export async function verifyAppleJWSWithHeader<T>(
  jws: string,
): Promise<DecodedJWS<T>> {
  // Cheap structural pre-check so a malformed value produces the same
  // message it always did, rather than a round trip to the worker.
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts");
  }

  const [headerB64, , signatureB64] = parts;
  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as JWSHeader;

  if (header.alg !== "ES256") {
    // Rejected locally. `none`, HS256 and RS256 are all downgrade
    // attempts, and the worker would refuse them too — but failing here
    // avoids a pointless network call and keeps the common case fast.
    throw new Error(`Unsupported algorithm: ${header.alg}, expected ES256`);
  }

  if (!header.x5c || header.x5c.length === 0) {
    throw new Error("Missing x5c certificate chain in JWS header");
  }

  try {
    // The payload comes back already decoded by the worker, from the same
    // bytes the signature covered. Re-decoding it here would be redundant.
    const verified = await verifyAppleJws<T>(jws, "transaction");

    return {
      header,
      payload: verified.payload,
      signature: signatureB64,
    };
  } catch (error) {
    logVerificationFailure("apple-jws", error, {
      // `kid` is a public identifier, safe to log and useful for
      // correlating a rejection with an Apple certificate rollout.
      kid: header.kid ?? null,
      chainLength: header.x5c?.length ?? 0,
      // Never the JWS itself: it is a bearer credential for whatever the
      // notification grants.
      jwsLength: jws.length,
    });
    throw error;
  }
}

/**
 * Whether a verification failure means "this payload is forged" or
 * "the verification service is down".
 *
 * The distinction decides the HTTP status a webhook returns. Reporting an
 * outage as a rejection locks out every legitimate user; reporting a
 * rejection as an outage invites a client to retry a forged payload
 * forever.
 */
export function isVerificationRejection(error: unknown): boolean {
  return isRejection(error);
}

/** Whether the verification service itself is unavailable. */
export function isVerificationUnavailable(error: unknown): boolean {
  return isUnavailable(error);
}
