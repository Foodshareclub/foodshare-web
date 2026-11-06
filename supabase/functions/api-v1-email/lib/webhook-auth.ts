/**
 * GoTrue send-email hook authentication.
 *
 * Supabase Auth signs hook requests using the Standard Webhooks scheme:
 * `webhook-id`, `webhook-timestamp` and `webhook-signature`, with the secret
 * configured in `GOTRUE_HOOK_SEND_EMAIL_SECRETS` (format `v1,whsec_<base64>`).
 *
 * The handler previously performed no verification at all, and the compose
 * file configured no secrets. Combined with a public URI, that made
 * `/webhook` an unauthenticated endpoint that would send an auth email — with
 * the attacker's chosen link target — to any address in the payload.
 *
 * The `standardwebhooks` package is already a declared dependency. It strips
 * the `whsec_` prefix, checks the timestamp with a five-minute tolerance, and
 * compares signatures in constant time.
 */

import { Webhook } from "standardwebhooks";
import { AppError, AuthenticationError } from "../../_shared/errors.ts";

const SECRET_ENV = "GOTRUE_HOOK_SEND_EMAIL_SECRETS";

/**
 * Extract the versioned signing secret from the comma-separated env value.
 *
 * GoTrue accepts `v1,whsec_...`; deployments may list several secrets during
 * rotation. Only a `whsec_` entry can verify a Standard Webhooks signature.
 */
export function getGoTrueWebhookSecret(): string | null {
  const configured = Deno.env.get(SECRET_ENV)?.trim();
  if (!configured) return null;

  for (const part of configured.split(",")) {
    const value = part.trim();
    if (value.startsWith("whsec_")) return value;
  }
  return null;
}

/**
 * Verify the signature on a GoTrue email hook.
 *
 * Fails closed: a deployment without a signing secret rejects every hook
 * rather than trusting unsigned requests. The alternative silently disables
 * the control the moment the environment variable is missing.
 */
export function verifyGoTrueEmailWebhook(
  request: Request,
  rawBody: string | undefined,
): void {
  const secret = getGoTrueWebhookSecret();
  if (!secret) {
    throw new AppError(
      "Email webhook signing secret is not configured",
      "WEBHOOK_NOT_CONFIGURED",
      503,
    );
  }

  if (!rawBody) {
    throw new AuthenticationError("Missing signed webhook body");
  }

  const headers: Record<string, string> = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  if (!headers["webhook-id"] || !headers["webhook-timestamp"] || !headers["webhook-signature"]) {
    throw new AuthenticationError("Missing webhook signature headers");
  }

  try {
    new Webhook(secret).verify(rawBody, headers);
  } catch {
    // Never include the payload or the secret in the error.
    throw new AuthenticationError("Invalid webhook signature");
  }
}
