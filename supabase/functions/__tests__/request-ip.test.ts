/**
 * Client IP derivation tests.
 *
 * The login blocklist used the first `X-Forwarded-For` entry, which is the one
 * the caller writes. These cases pin the safer choice: a proxy-set header when
 * present, otherwise the nearest hop, and never an unvalidated string.
 */

import { assertEquals } from "@std/assert";
import { getClientIp } from "../_shared/request-ip.ts";

function request(headers: Record<string, string>): Request {
  return new Request("https://api.example.test", { headers });
}

Deno.test("request-ip: prefers cf-connecting-ip", () => {
  assertEquals(
    getClientIp(
      request({
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      }),
    ),
    "203.0.113.9",
  );
});

Deno.test("request-ip: ignores the caller-supplied first X-Forwarded-For hop", () => {
  // An attacker prepends a value; the nearest proxy appends the real peer.
  assertEquals(
    getClientIp(request({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" })),
    "198.51.100.7",
  );
});

Deno.test("request-ip: accepts IPv6", () => {
  assertEquals(
    getClientIp(request({ "x-real-ip": "2001:db8::1" })),
    "2001:db8::1",
  );
});

Deno.test("request-ip: rejects non-IP values", () => {
  assertEquals(getClientIp(request({ "x-real-ip": "not-an-ip" })), null);
  assertEquals(
    getClientIp(request({ "x-forwarded-for": "evil.example, also-not-an-ip" })),
    null,
  );
});

Deno.test("request-ip: returns null when no header is present", () => {
  assertEquals(getClientIp(request({})), null);
});
