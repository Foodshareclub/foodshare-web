/**
 * api-v1-cache internal-auth gate tests.
 *
 * The diagnostic checks on this unauthenticated function (`?check=services`,
 * the detailed Redis check) read Vault secrets and return operational
 * detail. The gate must fail closed — no configured secret means every
 * diagnostic request is refused with 503, not answered — reject missing or
 * wrong tokens with 401, and accept the token in either header form with a
 * constant-time comparison.
 */

import { assertEquals } from "@std/assert";
import { constantTimeEqual, requireInternalToken } from "../_shared/internal-auth.ts";

const SECRET = "test-internal-secret-0123456789abcdef";

function requestWith(headers: Record<string, string> = {}): Request {
  return new Request(
    "https://api.example.test/functions/v1/api-v1-cache?check=services",
    { method: "GET", headers },
  );
}

Deno.test("constantTimeEqual: agrees on value, independent of length difference", () => {
  assertEquals(constantTimeEqual("abc", "abc"), true);
  assertEquals(constantTimeEqual("abc", "abd"), false);
  assertEquals(constantTimeEqual("abc", "abcd"), false);
  assertEquals(constantTimeEqual("", ""), true);
  assertEquals(constantTimeEqual("", "x"), false);
});

Deno.test("requireInternalToken: no secret configured fails closed with 503", async () => {
  Deno.env.delete("INTERNAL_SERVICE_SECRET");
  Deno.env.delete("WEBHOOK_SECRET");
  // No SUPABASE_URL/SERVICE_ROLE_KEY: the Vault lookup throws fast and the
  // environment fallback finds nothing — the production "not configured"
  // shape, without a network call.
  const result = await requireInternalToken(
    requestWith({ authorization: `Bearer ${SECRET}` }),
  );
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 503);
    assertEquals(result.code, "INTERNAL_NOT_CONFIGURED");
  }
});

Deno.test("requireInternalToken: missing token is 401 when the secret exists", async () => {
  Deno.env.set("INTERNAL_SERVICE_SECRET", SECRET);
  const result = await requireInternalToken(requestWith());
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
    assertEquals(result.code, "UNAUTHORIZED");
  }
});

Deno.test("requireInternalToken: wrong token is 401", async () => {
  Deno.env.set("INTERNAL_SERVICE_SECRET", SECRET);
  const result = await requireInternalToken(
    requestWith({ authorization: "Bearer wrong-token" }),
  );
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
  }
});

Deno.test("requireInternalToken: accepts Bearer form", async () => {
  Deno.env.set("INTERNAL_SERVICE_SECRET", SECRET);
  const result = await requireInternalToken(
    requestWith({ authorization: `Bearer ${SECRET}` }),
  );
  assertEquals(result.ok, true);
});

Deno.test("requireInternalToken: accepts X-Internal-Token form", async () => {
  Deno.env.set("INTERNAL_SERVICE_SECRET", SECRET);
  const result = await requireInternalToken(
    requestWith({ "x-internal-token": SECRET }),
  );
  assertEquals(result.ok, true);
});

Deno.test("requireInternalToken: rejects a prefix of the real token (no early exit)", async () => {
  Deno.env.set("INTERNAL_SERVICE_SECRET", SECRET);
  const result = await requireInternalToken(
    requestWith({ authorization: `Bearer ${SECRET.slice(0, 8)}` }),
  );
  assertEquals(result.ok, false);
});

Deno.test("cleanup: remove the test secret", () => {
  Deno.env.delete("INTERNAL_SERVICE_SECRET");
  Deno.env.delete("WEBHOOK_SECRET");
});
