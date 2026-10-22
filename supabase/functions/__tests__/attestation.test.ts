/**
 * Attestation tests for the two paths that used to accept unverified input.
 *
 * Both routes are chosen by the *client*, so a weak implementation is not a
 * degradation of defence-in-depth — it is a bypass of the whole gate. Each
 * test below uses input that the previous implementations accepted as
 * proof of a good device:
 *
 * - DeviceCheck returned `verified: true, trustLevel: "trusted"` for any
 *   base64 string of at least 50 characters.
 * - SafetyNet decoded the JWT payload and read `ctsProfileMatch` out of it
 *   without ever looking at the signature, so a hand-written payload
 *   containing `"ctsProfileMatch": true` passed.
 *
 * A regression on either is a fresh authentication bypass, so the tests
 * assert the verdict and the trust level, not just that no exception
 * escaped.
 *
 * @module
 */

import {
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "@std/assert";

import { verifyDeviceCheck } from "../api-v1-attestation/lib/device-check.ts";
import { verifySafetyNet } from "../api-v1-attestation/lib/android.ts";

/** Base64 of 60 bytes: comfortably past both length checks. */
const wellFormedToken = () => btoa("x".repeat(60));

/** A SafetyNet-shaped JWT whose payload claims perfect integrity. */
const forgedSafetyNetToken = () => {
  const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      ctsProfileMatch: true,
      basicIntegrity: true,
      apkPackageName: "com.flutterflow.foodshare",
      timestampMs: Date.now(),
    }),
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // The signature is deliberately garbage: nothing was ever checked here,
  // which is the defect.
  return `${
    header.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }.${payload}.forged-signature`;
};

Deno.test("DeviceCheck: a well-formed token is not proof of anything", async () => {
  const result = await verifyDeviceCheck(wellFormedToken());

  assertFalse(
    result.verified,
    "any 50-character base64 string must not verify as a trusted device",
  );
  assertStringIncludes(
    result.trustLevel as string,
    "unknown",
    "unverified input must not reach `trusted` or `verified`",
  );
  assertEquals(result.riskScore, 100, "an unattested device is maximal risk");
  assertStringIncludes(result.message ?? "", "App Attest");
});

Deno.test("DeviceCheck: a short token is refused", async () => {
  const result = await verifyDeviceCheck("abc");
  assertFalse(result.verified);
  assertEquals(result.message, "Invalid token format");
  assertEquals(result.riskScore, 100);
});

Deno.test("DeviceCheck: a token that is not base64 is refused", async () => {
  const result = await verifyDeviceCheck("!".repeat(60));
  assertFalse(result.verified);
  assertEquals(result.message, "Invalid token encoding");
  assertEquals(result.riskScore, 100);
});

Deno.test("DeviceCheck: base64 that decodes to too few bytes is refused", async () => {
  // Long enough on the wire (56 characters), short once decoded (40 bytes).
  const result = await verifyDeviceCheck(btoa("x".repeat(40)));
  assertFalse(result.verified);
  assertEquals(result.message, "Token data too short");
});

Deno.test("DeviceCheck: never reports trust, whatever the input", async () => {
  for (
    const token of [wellFormedToken(), btoa("x".repeat(4096)), "a".repeat(500)]
  ) {
    const result = await verifyDeviceCheck(token);
    assertFalse(result.verified, `token of length ${token.length} verified`);
    assertEquals(
      result.riskScore,
      100,
      `token of length ${token.length} was not scored as untrusted`,
    );
  }
});

Deno.test("SafetyNet: a forged integrity payload is not accepted", async () => {
  // This exact shape returned `verified: true` before the retirement.
  const result = await verifySafetyNet(forgedSafetyNetToken());

  assertFalse(
    result.verified,
    "an unsigned payload claiming ctsProfileMatch must never verify",
  );
  assertEquals(result.riskScore, 100);
  assertStringIncludes(result.message ?? "", "integrity");
});

Deno.test("SafetyNet: arbitrary bytes are refused", async () => {
  const result = await verifySafetyNet("not-a-jwt-at-all");
  assertFalse(result.verified);
  assertEquals(result.riskScore, 100);
});

Deno.test("SafetyNet: an empty token is refused", async () => {
  const result = await verifySafetyNet("");
  assertFalse(result.verified);
  assertEquals(result.trustLevel, "unknown");
});

Deno.test("both retired paths tell the client what to send instead", async () => {
  const deviceCheck = await verifyDeviceCheck(wellFormedToken());
  const safetyNet = await verifySafetyNet(forgedSafetyNetToken());

  assertStringIncludes(
    `${deviceCheck.message}`,
    "attestation",
    "the iOS message must name the type that works",
  );
  assertStringIncludes(
    `${safetyNet.message}`,
    "integrity",
    "the Android message must name the type that works",
  );
});
