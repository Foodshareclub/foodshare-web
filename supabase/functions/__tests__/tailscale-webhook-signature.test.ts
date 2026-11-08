/**
 * Tailscale webhook signature verification contract.
 *
 * The defect this pins: the handler verified HMAC over
 * `JSON.stringify(ctx.body)` — a re-serialization of the parsed body.
 * Whitespace and key order differ from the bytes Tailscale signs, so
 * every valid signature failed, and with no secret configured the
 * handler skipped verification entirely (fail open).
 *
 * Contract:
 *  - verification runs over the exact captured bytes (ctx.rawBody);
 *  - no captured bytes -> refuse (never verify a re-serialization);
 *  - no secret configured -> fail closed in production, fail open only
 *    in development (house rule, cf. _shared/webhook-security.ts).
 */
import { assert, assertEquals } from "@std/assert";
import { computeHmac, verifyHmacSignature } from "../_shared/webhook-security.ts";
import { verifyTailscaleWebhook } from "../api-v1-tailscale-webhook/lib/webhook-verification.ts";

Deno.test("tailscale webhook: valid signature over exact raw bytes is accepted", async () => {
  const secret = "test-tailscale-secret";
  const rawBody = JSON.stringify({
    type: "nodeCreated",
    node: { hostname: "test-node" },
  });
  const signature = await computeHmac(rawBody, secret);

  const result = await verifyTailscaleWebhook({
    rawBody,
    signature,
    secret,
  });

  assertEquals(result.valid, true, `expected valid, got: ${result.error}`);
});

Deno.test("tailscale webhook: verification is over the exact bytes, not a re-serialization", async () => {
  // The bytes on the wire: provider-formatted JSON. The parsed-then-
  // re-serialized form differs (spacing) and must NOT be what gets verified.
  const secret = "test-tailscale-secret";
  const wireBytes = `{"type": "nodeCreated", "node": {"hostname": "x"}}`;
  const signature = await computeHmac(wireBytes, secret);
  const reSerialized = JSON.stringify(JSON.parse(wireBytes));
  assert(reSerialized !== wireBytes, "precondition: forms must differ");

  const okRaw = await verifyTailscaleWebhook({ rawBody: wireBytes, signature, secret });
  assertEquals(okRaw.valid, true, "exact wire bytes must verify");

  // A verification that had only re-serialized bytes available would fail —
  // which is exactly why the handler must capture the raw body and refuse
  // when it is absent, instead of silently re-serializing.
  const okRe = await verifyHmacSignature(reSerialized, signature, secret);
  assertEquals(okRe.valid, false, "re-serialized bytes must NOT verify");
});

Deno.test("tailscale webhook: refuses when the raw body was not captured", async () => {
  const secret = "test-tailscale-secret";
  const signature = await computeHmac('{"type":"nodeCreated"}', secret);

  const result = await verifyTailscaleWebhook({
    rawBody: undefined,
    signature,
    secret,
  });

  assertEquals(result.valid, false, "must not verify without the exact bytes");
  assert(result.error, "failure must carry an error reason");
});

Deno.test("tailscale webhook: missing secret fails closed in production", async () => {
  const result = await verifyTailscaleWebhook({
    rawBody: '{"type":"nodeCreated"}',
    signature: "whatever",
    secret: undefined,
    isDev: false,
  });

  assertEquals(result.valid, false);
  assert(
    result.error?.toLowerCase().includes("secret"),
    `error must say the secret is missing, got: ${result.error}`,
  );
});

Deno.test("tailscale webhook: missing secret fails open in development only", async () => {
  const result = await verifyTailscaleWebhook({
    rawBody: '{"type":"nodeCreated"}',
    signature: "whatever",
    secret: undefined,
    isDev: true,
  });

  assertEquals(result.valid, true, "development stays usable without a secret");
});

Deno.test("tailscale webhook: wrong signature is rejected", async () => {
  const secret = "test-tailscale-secret";
  const rawBody = '{"type":"nodeCreated"}';
  const forged = await computeHmac(rawBody, "attacker-secret");

  const result = await verifyTailscaleWebhook({ rawBody, signature: forged, secret });

  assertEquals(result.valid, false);
});

Deno.test("tailscale webhook: missing signature header is rejected", async () => {
  const result = await verifyTailscaleWebhook({
    rawBody: '{"type":"nodeCreated"}',
    signature: null,
    secret: "test-tailscale-secret",
  });

  assertEquals(result.valid, false);
});
