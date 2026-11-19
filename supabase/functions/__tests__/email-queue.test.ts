/**
 * Email queue decision tests.
 *
 * `api-v1-email/lib/queue.ts` had no test coverage at all, which is how three
 * defects survived in it: a claim that did not claim, a write-back with no
 * state guard, and a select of a column that does not exist. The database-side
 * properties are covered by the PostgreSQL suite in
 * `services/crates/fs-db/tests/database.rs`, which exercises the real
 * functions; what is left here is the logic the TypeScript owns.
 *
 * The two functions below decide, per email, whether a real person ever
 * receives the message. `isHardBounce` answering wrongly in one direction
 * abandons a deliverable email; in the other it spends the whole retry budget
 * on an address that will never accept mail. Both directions are pinned.
 */

import { assertEquals } from "@std/assert";
import { buildEmailContent, getErrorCode, isHardBounce } from "../api-v1-email/lib/queue.ts";
import { getServiceRoleClient, type QueuedEmail } from "../api-v1-email/lib/utils.ts";

// =============================================================================
// Hard bounce classification
// =============================================================================

Deno.test("email queue: an address that does not exist is permanent", () => {
  // Each of these is a real provider response meaning "stop asking". If any
  // is treated as retryable, the queue burns the full budget on it and then
  // gives up anyway, having made three pointless provider calls.
  const permanent = [
    "550 mailbox does not exist",
    "550 5.1.1 user unknown",
    "550 5.1.2 mailbox not found",
    "The email address is invalid",
    "invalid email address",
    "User unknown",
    "This user has been unsubscribed",
    "Recipient complained",
    "Sending blocked",
    "Address is on the blacklist",
  ];
  for (const error of permanent) {
    assertEquals(
      isHardBounce(error),
      true,
      `should be permanent: ${error}`,
    );
  }
});

Deno.test("email queue: the phrase order does not decide whether it is a bounce", () => {
  // Both of these were missed by order-dependent patterns — `/invalid.*email/`
  // and `/not.*exist/` — so a permanently invalid address was retried until
  // the budget ran out, three provider calls per address per cycle. Caught by
  // the first version of this suite, which is the argument for having it.
  assertEquals(
    isHardBounce("The email address is invalid"),
    true,
    "email before invalid",
  );
  assertEquals(
    isHardBounce("the user no longer exists"),
    true,
    "no longer exists",
  );
  assertEquals(
    isHardBounce("unknown recipient"),
    true,
    "unknown before recipient",
  );
});

Deno.test("email queue: a transient failure is retryable", () => {
  // The opposite error: getting any of these wrong means a mail server blip
  // silently discards real mail, which is the failure users notice.
  const transient = [
    "HTTP 429: Too Many Requests",
    "Request timed out",
    "ECONNRESET",
    "503 Service Unavailable",
    "Temporary failure in name resolution",
    "socket hang up",
  ];
  for (const error of transient) {
    assertEquals(
      isHardBounce(error),
      false,
      `should be retryable: ${error}`,
    );
  }
});

Deno.test("email queue: a credential failure is not classified as a bounce", () => {
  // Not a bounce: the message may be perfectly deliverable, and the
  // credential is the problem. It is not retried by this function because the
  // pattern list does not match, which is the right outcome — retrying an
  // unauthorised request is the caller-level circuit breaker's job, not the
  // queue's. Pinned because the two are easy to conflate.
  assertEquals(isHardBounce("401 Unauthorized: invalid API key"), false);
});

// =============================================================================
// Error codes
// =============================================================================

Deno.test("email queue: an SMTP status in the message becomes the code", () => {
  // The provider's own status is the most useful thing in the error string,
  // so it wins over the keyword heuristics below.
  assertEquals(getErrorCode("550 5.1.1 mailbox does not exist"), "550");
  assertEquals(getErrorCode("HTTP 429 Too Many Requests"), "429");
  assertEquals(getErrorCode("got 503 back"), "503");
  assertEquals(getErrorCode("400 Bad Request"), "400");
});

Deno.test("email queue: keywords are used when there is no status", () => {
  assertEquals(getErrorCode("Rate limit exceeded, try later"), "RATE_LIMIT");
  // A status in the message always wins, so `AUTH_ERROR` is only reachable
  // when the provider named the condition without a code.
  assertEquals(getErrorCode("401 unauthorized"), "401");
  assertEquals(getErrorCode("authorization failed"), "AUTH_ERROR");
  assertEquals(getErrorCode("hard bounce detected"), "BOUNCED");
  assertEquals(getErrorCode("Invalid email supplied"), "INVALID_EMAIL");
});

Deno.test("email queue: an unrecognised error still gets a code", () => {
  // `UNKNOWN` rather than an empty string, so the column is queryable and a
  // group-by does not collapse unrelated failures into a null bucket.
  assertEquals(getErrorCode("something nobody anticipated"), "UNKNOWN");
  assertEquals(getErrorCode(""), "UNKNOWN");
});

Deno.test("email queue: the code is a status when one is present, even with keywords", () => {
  // Precedence is pinned because the two orderings disagree: a rate limit
  // reported as 429 should group with other 429s, not with keyword matches.
  assertEquals(getErrorCode("429 rate limit"), "429");
  assertEquals(getErrorCode("rate limit 429 exceeded"), "429");
});

// =============================================================================
// Content building
// =============================================================================

function campaignClient(
  row: {
    subject: string;
    html_content: string | null;
    plain_text_content: string | null;
  } | null,
): ReturnType<typeof getServiceRoleClient> {
  // Only the `newsletter_campaigns` fetch is exercised; the builder chain is
  // opaque beyond the terminal `.single()`.
  const builder = {
    select(_cols: string) {
      return builder;
    },
    eq(_col: string, _val: unknown) {
      return builder;
    },
    single: async () =>
      row === null
        ? { data: null, error: { message: "PGRST116: no rows" } }
        : { data: row, error: null },
  };
  return {
    from(_table: string) {
      return builder;
    },
  } as unknown as ReturnType<typeof getServiceRoleClient>;
}

function newsletterEmail(
  overrides: Partial<QueuedEmail> = {},
): QueuedEmail {
  return {
    id: "q1",
    user_id: "u1",
    user_email: "user@example.com",
    email_type: "newsletter",
    campaign_id: "c1",
    template_slug: null,
    user_first_name: null,
    retry_count: 0,
    metadata: {},
    ...overrides,
  };
}

Deno.test("email queue: a campaign without HTML has no buildable content", async () => {
  // `html_content` is nullable in the schema. Returning `null` releases the
  // row for retry — the same contract as a missing template — instead of
  // throwing in the personalizer (which the send loop would record as a
  // permanent failure and burn the retry budget on).
  const client = campaignClient({
    subject: "Newsletter",
    html_content: null,
    plain_text_content: "plain only",
  });
  const result = await buildEmailContent(client, newsletterEmail());
  assertEquals(result, null);
});

Deno.test("email queue: a campaign with HTML is built and personalized", async () => {
  const client = campaignClient({
    subject: "Newsletter",
    html_content: "<p>Hi {{name}}</p>",
    plain_text_content: null,
  });
  const result = await buildEmailContent(
    client,
    newsletterEmail({ user_first_name: "Ada" }),
  );
  assertEquals(result?.subject, "Newsletter");
  assertEquals(result?.html, "<p>Hi Ada</p>");
  assertEquals(result?.text, undefined);
});
