/**
 * Tailscale webhook signature verification.
 *
 * Tailscale signs the exact request bytes, so verification must run over
 * the raw body the handler captured (`captureRawBody`), never over a
 * re-serialization of the parsed body — whitespace and key order change
 * and every valid signature fails. When the raw bytes were not captured,
 * verification refuses rather than guessing at a byte form.
 *
 * Secret handling follows the house rule for webhook endpoints in this
 * repo: fail open only in development, fail closed everywhere else.
 */
import { isDevelopment } from "../../_shared/utils.ts";
import { verifyHmacSignature } from "../../_shared/webhook-security.ts";

export interface TailscaleVerificationInput {
  /** Exact request bytes (`ctx.rawBody`); undefined when capture was off. */
  rawBody?: string;
  /** Value of the `X-Tailscale-Signature` header. */
  signature: string | null;
  /** `TAILSCALE_WEBHOOK_SECRET`; undefined when not configured. */
  secret?: string;
  /** Development mode: skip (rather than fail) when the secret is unset. */
  isDev?: boolean;
}

export interface TailscaleVerificationResult {
  valid: boolean;
  error?: string;
}

export async function verifyTailscaleWebhook(
  input: TailscaleVerificationInput,
): Promise<TailscaleVerificationResult> {
  const { rawBody, signature, secret } = input;
  const isDev = input.isDev ?? isDevelopment();

  if (!secret) {
    if (isDev) {
      return { valid: true };
    }
    return { valid: false, error: "Webhook secret not configured" };
  }

  if (rawBody === undefined) {
    return {
      valid: false,
      error: "Raw request body unavailable for signature verification",
    };
  }

  return verifyHmacSignature(rawBody, signature, secret);
}
