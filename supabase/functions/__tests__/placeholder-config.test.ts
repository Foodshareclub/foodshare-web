/**
 * The templates' example values.
 *
 * The estate's environment files are copied from the templates, and the
 * templates carry example values. A service configured with one of them
 * is not configured, and the difference matters: a missing value means
 * nobody set it, and a placeholder means somebody set the example. Both
 * are "not configured", and neither is a broken service.
 *
 * The estate had no Upstash instance, and the keep-alive reported
 * "Redis: error" on every run because the check tried to reach
 * "your-instance.upstash.io" and reported the failure to resolve a host
 * that was never there as a broken service.
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  isConfigured,
  isMissingValue,
  isPlaceholderValue,
  notConfiguredReason,
} from "../_shared/placeholder-config.ts";

Deno.test("the templates' example values are recognised as placeholders", () => {
  assert(isPlaceholderValue("https://your-instance.upstash.io"));
  assert(isPlaceholderValue("your-upstash-rest-token"));
  assert(isPlaceholderValue("your-twilio-account-sid"));
  assert(isPlaceholderValue("https://your-instance.upstash.io/"));
});

Deno.test("a real value is not a placeholder", () => {
  assertEquals(isPlaceholderValue("https://quiet-mouse-12345.upstash.io"), false);
  assertEquals(isPlaceholderValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), false);
  assertEquals(isPlaceholderValue("https://api.foodshare.club"), false);
});

Deno.test("a placeholder is not a missing value", () => {
  assertEquals(isPlaceholderValue(""), false);
  assertEquals(isPlaceholderValue("   "), false);
  assertEquals(isPlaceholderValue(undefined), false);
  assertEquals(isMissingValue(""), true);
  assertEquals(isMissingValue("  "), true);
  assertEquals(isMissingValue("https://your-instance.upstash.io"), false);
});

Deno.test("a service needs a value for the service and a value for the key", () => {
  assertEquals(isConfigured("https://quiet-mouse.upstash.io", "token"), true);
  assertEquals(isConfigured("", "token"), false);
  assertEquals(isConfigured("https://quiet-mouse.upstash.io", ""), false);
});

Deno.test("a service whose value is the template's example is not configured", () => {
  assertEquals(isConfigured("https://your-instance.upstash.io", "token"), false);
  assertEquals(isConfigured("https://quiet-mouse.upstash.io", "your-upstash-rest-token"), false);
});

Deno.test("the reason a service is not configured can be acted on", () => {
  assertEquals(notConfiguredReason("", "token"), "Not configured (skipped)");
  assert(notConfiguredReason("https://your-instance.upstash.io", "token").includes("placeholder"));
  assertEquals(notConfiguredReason("https://quiet-mouse.upstash.io", "token"), "Configured");
});
