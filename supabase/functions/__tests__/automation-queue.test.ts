/**
 * Automation content resolution tests.
 *
 * `resolveAutomationEmailContent` decides, per queue row, whether the item
 * is deliverable at all — and when it is not, *why* not. The two reasons
 * are not interchangeable: `no_recipient` is permanent (a profile with no
 * address will not acquire one) and `no_content` is retryable (a template
 * missing today may exist by the next tick). The distinction is what lets
 * the processor choose between `fail_automation_attempts` and
 * `release_automation_claims`.
 *
 * The queue invariants themselves — the atomic claim, the guarded
 * write-backs, the stale recovery — are covered against a real PostgreSQL
 * 17 in `services/crates/fs-db/tests/automation.rs`; what is tested here is
 * the logic the TypeScript owns.
 */

import { assertEquals } from "@std/assert";
import { resolveAutomationEmailContent } from "../api-v1-email/lib/queue.ts";
import { createMockSupabaseClient } from "./test-utils.ts";

/**
 * The mock client is table-keyed and chainable; the resolver wants the real
 * `SupabaseClient` type. The cast is the seam — the mock implements exactly
 * the surface the resolver uses (`from().select().eq().single()`).
 */
function mockClient(
  config: Parameters<typeof createMockSupabaseClient>[0],
) {
  return createMockSupabaseClient(config) as unknown as Parameters<
    typeof resolveAutomationEmailContent
  >[0];
}

// =============================================================================
// The two failure reasons
// =============================================================================

Deno.test("automation content: a profile with no address is a permanent failure", async () => {
  // Not "no profile" and "profile with null email" are the same outcome
  // here: either way there is nowhere to send. Pinned because treating this
  // as retryable spent the whole attempt budget on an address that will
  // never accept mail.
  for (const profile of [null, { email: null, first_name: null, nickname: null }]) {
    const supabase = mockClient({
      queryResults: new Map([["profiles", profile ? [profile] : []]]),
    });

    const resolved = await resolveAutomationEmailContent(
      supabase,
      { subject: "hi", html: "<p>hi</p>" },
      "profile-1",
    );

    assertEquals(resolved.ok, false, `profile ${JSON.stringify(profile)}`);
    if (!resolved.ok) {
      assertEquals(resolved.reason, "no_recipient");
    }
  }
});

Deno.test("automation content: no template and no inline content is retryable", async () => {
  // The profile has an address, so the email is deliverable in principle.
  // What is missing is the content — which a template created after
  // enrollment would supply. Released, not failed.
  const supabase = mockClient({
    queryResults: new Map([
      ["profiles", [{ email: "user@example.com", first_name: "Sam", nickname: null }]],
      ["email_templates", []],
    ]),
  });

  const resolved = await resolveAutomationEmailContent(
    supabase,
    { template_slug: "welcome" },
    "profile-1",
  );

  assertEquals(resolved.ok, false);
  if (!resolved.ok) {
    assertEquals(resolved.reason, "no_content");
  }
});

// =============================================================================
// The two success paths
// =============================================================================

Deno.test("automation content: a template is personalised with the profile", async () => {
  const supabase = mockClient({
    queryResults: new Map([
      ["profiles", [{ email: "user@example.com", first_name: "Sam", nickname: "Sammy" }]],
      ["email_templates", [{
        subject: "Welcome {{name}}!",
        html_content: "<p>Hi {{name}}, you are at {{email}}</p>",
      }]],
    ]),
  });

  const resolved = await resolveAutomationEmailContent(
    supabase,
    { template_slug: "welcome" },
    "profile-1",
  );

  assertEquals(resolved.ok, true);
  if (resolved.ok) {
    assertEquals(resolved.content.subject, "Welcome Sam!");
    assertEquals(resolved.content.html, "<p>Hi Sam, you are at user@example.com</p>");
    assertEquals(resolved.content.to, "user@example.com");
  }
});

Deno.test("automation content: inline content is used when there is no template", async () => {
  // The flow's own step content, with no template involved.
  const supabase = mockClient({
    queryResults: new Map([
      ["profiles", [{ email: "user@example.com", first_name: null, nickname: "Sammy" }]],
      ["email_templates", []],
    ]),
  });

  const resolved = await resolveAutomationEmailContent(
    supabase,
    { subject: "Your step {{name}}", html: "<p>Hi {{name}}</p>" },
    "profile-1",
  );

  assertEquals(resolved.ok, true);
  if (resolved.ok) {
    // nickname is the fallback when first_name is absent.
    assertEquals(resolved.content.subject, "Your step Sammy");
    assertEquals(resolved.content.html, "<p>Hi Sammy</p>");
  }
});

Deno.test("automation content: a missing template falls through to inline content", async () => {
  // `template_slug` set but the template absent is not fatal when the step
  // carries its own subject and html — the fallback the resolver exists
  // for. Only when *neither* source has content is the row undeliverable.
  const supabase = mockClient({
    queryResults: new Map([
      ["profiles", [{ email: "user@example.com", first_name: "Sam", nickname: null }]],
      ["email_templates", []],
    ]),
  });

  const resolved = await resolveAutomationEmailContent(
    supabase,
    { template_slug: "missing", subject: "Inline", html: "<p>Inline</p>" },
    "profile-1",
  );

  assertEquals(resolved.ok, true);
  if (resolved.ok) {
    assertEquals(resolved.content.subject, "Inline");
  }
});

Deno.test("automation content: a template is preferred over inline content", async () => {
  // When both exist, the template wins — it is the reviewed, translatable
  // source, and the inline content is the fallback for flows that predate
  // templates.
  const supabase = mockClient({
    queryResults: new Map([
      ["profiles", [{ email: "user@example.com", first_name: "Sam", nickname: null }]],
      ["email_templates", [{
        subject: "From the template",
        html_content: "<p>Template</p>",
      }]],
    ]),
  });

  const resolved = await resolveAutomationEmailContent(
    supabase,
    { template_slug: "welcome", subject: "Inline", html: "<p>Inline</p>" },
    "profile-1",
  );

  assertEquals(resolved.ok, true);
  if (resolved.ok) {
    assertEquals(resolved.content.subject, "From the template");
  }
});
