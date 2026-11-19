/**
 * Webhook Security
 *
 * Secure webhook signature verification for the live providers:
 * - Meta (WhatsApp, Instagram, Facebook) — `verifyMetaWebhook`
 * - Generic HMAC — `verifyHmacSignature` (used by the Tailscale webhook)
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * The Stripe/GitHub/Twilio verifiers, the base64 HMAC variant, the
 * middleware factory and the Meta challenge handler that used to live
 * here had no call sites anywhere in the estate and were removed. Edge
 * functions deploy from this repo, so dead here means dead in production
 * too.
 *
 * Note for the next liveness audit: the Telegram bot imports
 * `verifyTelegramWebhook` under the alias `verifyTelegramSignature`
 * (telegram-bot-foodshare/index.ts), so a plain name grep for the call
 * sites undercounts it. The type-check baseline
 * (`typecheck-baseline.test.ts`) is the authority on this module's
 * surface.
 */

import { timingSafeEqual } from "./utils.ts";

// =============================================================================
// Types
// =============================================================================

export type HashAlgorithm = "SHA-256" | "SHA-1" | "SHA-384" | "SHA-512";

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

export interface WebhookProviderConfig {
  /** Header name containing the signature */
  signatureHeader: string;
  /** Signature prefix (e.g., "sha256=") */
  signaturePrefix: string;
  /** Hash algorithm */
  algorithm: HashAlgorithm;
  /** Timestamp header (optional, for replay protection) */
  timestampHeader?: string;
  /** Maximum age in seconds for replay protection */
  maxAgeSeconds?: number;
}

// =============================================================================
// Provider Configurations
// =============================================================================

export const WebhookProviders = {
  /**
   * Meta Platform (WhatsApp, Instagram, Facebook)
   * Uses X-Hub-Signature-256 header with sha256= prefix
   */
  meta: {
    signatureHeader: "X-Hub-Signature-256",
    signaturePrefix: "sha256=",
    algorithm: "SHA-256",
  } as WebhookProviderConfig,

  /**
   * Telegram
   * Uses X-Telegram-Bot-Api-Secret-Token header for webhook verification
   */
  telegram: {
    signatureHeader: "X-Telegram-Bot-Api-Secret-Token",
    signaturePrefix: "",
    algorithm: "SHA-256", // Not actually HMAC - simple token comparison
  } as WebhookProviderConfig,
} as const;

// =============================================================================
// Core HMAC Functions
// =============================================================================

/**
 * Compute HMAC signature
 */
export async function computeHmac(
  payload: string,
  secret: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  // Convert to hex
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Delegates to the shared timingSafeEqual implementation in utils.ts
 */
export const constantTimeCompare = timingSafeEqual;

// =============================================================================
// Provider-Specific Verification
// =============================================================================

/**
 * Verify Meta platform webhook signature (WhatsApp, Instagram, Facebook)
 *
 * @example
 * ```typescript
 * const isValid = await verifyMetaWebhook(rawBody, req.headers, appSecret);
 * if (!isValid) {
 *   return new Response("Invalid signature", { status: 401 });
 * }
 * ```
 */
export async function verifyMetaWebhook(
  payload: string,
  headers: Headers,
  secret: string,
): Promise<WebhookVerificationResult> {
  const signature = headers.get(WebhookProviders.meta.signatureHeader);

  if (!signature) {
    return { valid: false, error: "Missing signature header" };
  }

  if (!signature.startsWith(WebhookProviders.meta.signaturePrefix)) {
    return { valid: false, error: "Invalid signature format" };
  }

  const providedHash = signature.slice(
    WebhookProviders.meta.signaturePrefix.length,
  );
  const computedHash = await computeHmac(
    payload,
    secret,
    WebhookProviders.meta.algorithm,
  );

  if (!constantTimeCompare(computedHash, providedHash)) {
    return { valid: false, error: "Signature mismatch" };
  }

  return { valid: true };
}

/**
 * Verify Telegram webhook secret token
 * Telegram uses a simple token comparison (not HMAC)
 *
 * @example
 * ```typescript
 * const result = verifyTelegramWebhook(req.headers, webhookSecret);
 * if (!result.valid) {
 *   return new Response(result.error, { status: 401 });
 * }
 * ```
 */
export function verifyTelegramWebhook(
  headers: Headers,
  secret: string,
): WebhookVerificationResult {
  const token = headers.get(WebhookProviders.telegram.signatureHeader);

  if (!token) {
    return {
      valid: false,
      error: "Missing X-Telegram-Bot-Api-Secret-Token header",
    };
  }

  if (!constantTimeCompare(token, secret)) {
    return { valid: false, error: "Secret token mismatch" };
  }

  return { valid: true };
}

// =============================================================================
// Generic HMAC Verification
// =============================================================================

/**
 * Verify HMAC signature with configurable options
 *
 * @example
 * ```typescript
 * const result = await verifyHmacSignature(rawBody, signature, secret, {
 *   algorithm: "SHA-256",
 *   prefix: "sha256=",
 * });
 * ```
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string | null,
  secret: string,
  options?: {
    algorithm?: HashAlgorithm;
    prefix?: string;
  },
): Promise<WebhookVerificationResult> {
  if (!signature) {
    return { valid: false, error: "Missing signature" };
  }

  const algorithm = options?.algorithm || "SHA-256";
  const prefix = options?.prefix || "";

  // Remove prefix if present
  let providedHash = signature;
  if (prefix && signature.startsWith(prefix)) {
    providedHash = signature.slice(prefix.length);
  }

  const computedHash = await computeHmac(payload, secret, algorithm);

  if (!constantTimeCompare(computedHash, providedHash)) {
    return { valid: false, error: "Signature mismatch" };
  }

  return { valid: true };
}
