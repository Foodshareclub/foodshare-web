/**
 * GoTrue send-email webhook tests.
 *
 * `/webhook` sends mail. Before this change it accepted any POST, so these
 * tests are less about parsing and more about the endpoint refusing to be an
 * open relay.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { Webhook } from "standardwebhooks";
import { AppError } from "../_shared/errors.ts";
import {
  getGoTrueWebhookSecret,
  verifyGoTrueEmailWebhook,
} from "../api-v1-email/lib/webhook-auth.ts";

const SECRET_B64 = btoa("0123456789abcdef0123456789abcdef");
const SECRET = `whsec_${SECRET_B64}`;
const BODY = JSON.stringify({
  user: { id: "u1", email: "member@example.test" },
  email_data: { email_action_type: "recovery", token_hash: "abc" },
});

function signedRequest(
  options: {
    body?: string;
    secret?: string;
    id?: string;
    timestamp?: Date;
    signature?: string;
  } = {},
): { request: Request; body: string } {
  const body = options.body ?? BODY;
  const id = options.id ?? "msg_123";
  const date = options.timestamp ?? new Date();
  const hook = new Webhook(options.secret ?? SECRET);
  const signature = options.signature ?? hook.sign(id, date, body);

  const request = new Request("https://api.example.test/functions/v1/api-v1-email/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(date.getTime() / 1000)),
      "webhook-signature": signature,
    },
    body,
  });

  return { request, body };
}

function withSecret(value: string | undefined, fn: () => void): void {
  const previous = Deno.env.get("GOTRUE_HOOK_SEND_EMAIL_SECRETS");
  if (value === undefined) Deno.env.delete("GOTRUE_HOOK_SEND_EMAIL_SECRETS");
  else Deno.env.set("GOTRUE_HOOK_SEND_EMAIL_SECRETS", value);
  try {
    fn();
  } finally {
    if (previous === undefined) Deno.env.delete("GOTRUE_HOOK_SEND_EMAIL_SECRETS");
    else Deno.env.set("GOTRUE_HOOK_SEND_EMAIL_SECRETS", previous);
  }
}

Deno.test("gotrue-webhook: accepts a correctly signed request", () => {
  withSecret(`v1,${SECRET}`, () => {
    const { request, body } = signedRequest();
    verifyGoTrueEmailWebhook(request, body);
  });
});

Deno.test("gotrue-webhook: rejects a tampered body", () => {
  withSecret(`v1,${SECRET}`, () => {
    const { request } = signedRequest();
    assertThrows(
      () =>
        verifyGoTrueEmailWebhook(
          request,
          BODY.replace("member@example.test", "attacker@example.test"),
        ),
      AppError,
    );
  });
});

Deno.test("gotrue-webhook: rejects a different secret", () => {
  withSecret(`v1,${SECRET}`, () => {
    const { request, body } = signedRequest({
      secret: `whsec_${btoa("ffffffffffffffffffffffffffffffff")}`,
    });
    assertThrows(() => verifyGoTrueEmailWebhook(request, body), AppError);
  });
});

Deno.test("gotrue-webhook: rejects a stale signature", () => {
  withSecret(`v1,${SECRET}`, () => {
    const { request, body } = signedRequest({
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    });
    assertThrows(() => verifyGoTrueEmailWebhook(request, body), AppError);
  });
});

Deno.test("gotrue-webhook: rejects missing signature headers", () => {
  withSecret(`v1,${SECRET}`, () => {
    const request = new Request("https://api.example.test/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: BODY,
    });
    assertThrows(() => verifyGoTrueEmailWebhook(request, BODY), AppError);
  });
});

Deno.test("gotrue-webhook: fails closed without a configured secret", () => {
  withSecret(undefined, () => {
    const { request, body } = signedRequest();
    const error = assertThrows(
      () => verifyGoTrueEmailWebhook(request, body),
      AppError,
    );
    assertEquals((error as AppError).code, "WEBHOOK_NOT_CONFIGURED");
    assertEquals((error as AppError).statusCode, 503);
  });
});

Deno.test("gotrue-webhook: parses the whsec entry from a v1 secret list", () => {
  withSecret(`v1,${SECRET}`, () => {
    assertEquals(getGoTrueWebhookSecret(), SECRET);
  });
});
