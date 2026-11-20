import { assertEquals } from "@std/assert";
import { isProxiedRequest, isTelemetryPath, isValidServiceName } from "../main/request-guards.ts";

Deno.test("telemetry paths are identified", () => {
  for (const path of ["/_internal/health", "/_internal/metric", "/metrics"]) {
    assertEquals(isTelemetryPath(path), true);
  }
  assertEquals(isTelemetryPath("/api-v1-health/health"), false);
});

Deno.test("gateway-forwarded requests are treated as public", () => {
  assertEquals(isProxiedRequest(new Headers({ "X-Forwarded-For": "203.0.113.9" })), true);
  assertEquals(isProxiedRequest(new Headers({ "X-Real-IP": "203.0.113.9" })), true);
  assertEquals(isProxiedRequest(new Headers({ Forwarded: "for=203.0.113.9" })), true);
});

Deno.test("direct in-network requests are not treated as proxied", () => {
  assertEquals(isProxiedRequest(new Headers({ Host: "functions:9000" })), false);
});

Deno.test("valid function names are accepted", () => {
  for (const name of ["api-v1-health", "telegram-bot-foodshare", "api-v1-products"]) {
    assertEquals(isValidServiceName(name), true);
  }
});

Deno.test("traversal, encoded, reserved and malformed names are rejected", () => {
  for (
    const name of ["..", ".", "%2e%2e", "..%2f..", "a%2fb", "a.b", "main", "_shared", "", "A/B"]
  ) {
    assertEquals(isValidServiceName(name), false, name);
  }
});
