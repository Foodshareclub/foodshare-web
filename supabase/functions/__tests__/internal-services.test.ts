/**
 * Tests for the internal Rust services client.
 *
 * The client's whole job is to classify a worker's response correctly:
 * a rejection is a decision and must never be retried, an outage is not a
 * decision and must never be reported as one. Getting that backwards is
 * harmful in both directions — reporting an outage as a rejection locks
 * out every legitimate user, and reporting a rejection as an outage
 * invites a client to retry a forged payload forever.
 *
 * The worker is stubbed at the `fetch` boundary rather than mocked as a
 * module, so the tests exercise the real request shape, the real header
 * handling and the real error parsing.
 *
 * @module
 */

import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  fetchTrustAnchors,
  InternalServiceUnavailableError,
  isRejection,
  isUnavailable,
  VerificationRejectedError,
  verifyAppAttest,
  verifyAppAttestAssertion,
  verifyAppleJws,
} from "../_shared/internal-services.ts";

/** One recorded outbound request. */
interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

const recorded: Recorded[] = [];

/** The next response the stub returns. */
let nextResponse: { status: number; body: unknown } | null = null;

/** Set the token the client will send. */
Deno.env.set("INTERNAL_API_TOKEN", "test-internal-token");
Deno.env.set("WORKER_INTERNAL_URL", "http://worker.test");

const realFetch = globalThis.fetch;

// deno-lint-ignore no-explicit-any
globalThis.fetch = (input: any, init?: any): Promise<Response> => {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(init?.headers ?? {})) {
    headers[key.toLowerCase()] = String(value);
  }

  recorded.push({
    url: String(input),
    method: init?.method ?? "GET",
    headers,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  });

  const response = nextResponse ?? { status: 200, body: {} };
  nextResponse = null;

  return Promise.resolve(
    new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": "application/json" },
    }),
  );
};

function reset(): void {
  recorded.length = 0;
  nextResponse = null;
}

// A minimal structurally-valid JWS. The client does not parse it beyond
// the header, and the worker is stubbed, so the contents are irrelevant —
// but keeping it well-formed means a test failure is never caused by the
// client's own parsing.
const WELL_FORMED_JWS = [
  btoa('{"alg":"ES256","x5c":["AAAA"]}'),
  btoa('{"transactionId":"1"}'),
  "AAAA",
].join(".");

// ── Apple JWS ─────────────────────────────────────────────────────────

Deno.test("verifyAppleJws: returns the payload and anchor on success", async () => {
  reset();
  nextResponse = {
    status: 200,
    body: {
      verified: true,
      anchorFingerprint: "abc123",
      payload: { transactionId: "2000", productId: "premium.monthly" },
    },
  };

  const result = await verifyAppleJws<{ transactionId: string }>(
    WELL_FORMED_JWS,
    "transaction",
  );

  assertEquals(result.anchorFingerprint, "abc123");
  assertEquals(result.payload.transactionId, "2000");
  assertEquals(recorded.length, 1);
  assertEquals(recorded[0].method, "POST");
  assertStringIncludes(recorded[0].url, "/internal/verify/apple-jws");
  assertEquals(recorded[0].headers["authorization"], "Bearer test-internal-token");
  assertEquals(
    (recorded[0].body as { kind: string }).kind,
    "transaction",
  );
});

Deno.test("verifyAppleJws: a 401 is a rejection, not an outage", async () => {
  reset();
  nextResponse = {
    status: 401,
    body: {
      error: "verification_failed",
      message: "chain does not terminate at a configured trust anchor",
    },
  };

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    VerificationRejectedError,
  );
  assert(isRejection(error));
  assert(!isUnavailable(error));
  assertEquals(error.code, "verification_failed");
  assertStringIncludes(error.message, "trust anchor");
});

Deno.test("verifyAppleJws: a 503 no-trust-anchor is an outage, not a rejection", async () => {
  // The worker answers 503 when no trust anchor is configured. That is a
  // deployment fault and says nothing about the caller. Treating it as a
  // rejection would lock out every device during a misconfiguration.
  reset();
  nextResponse = {
    status: 503,
    body: { error: "no_trust_anchor", message: "no trust anchor configured" },
  };

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    InternalServiceUnavailableError,
  );
  assert(isUnavailable(error));
  assert(!isRejection(error));
});

Deno.test("verifyAppleJws: a 500 is an outage, not a rejection", async () => {
  reset();
  nextResponse = { status: 500, body: { error: "internal", message: "boom" } };

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    InternalServiceUnavailableError,
  );
  assert(isUnavailable(error));
});

Deno.test("verifyAppleJws: a 429 is an outage, not a rejection", async () => {
  // Rate limiting is the worker being busy, not a verdict on the payload.
  reset();
  nextResponse = { status: 429, body: { error: "rate_limited", message: "slow down" } };

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    InternalServiceUnavailableError,
  );
  assert(isUnavailable(error));
});

Deno.test("verifyAppleJws: a 400 is a rejection (our request is malformed)", async () => {
  reset();
  nextResponse = {
    status: 400,
    body: { error: "malformed_request", message: "expected 3 dot-separated parts" },
  };

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    VerificationRejectedError,
  );
  assert(isRejection(error));
  assertEquals(error.code, "malformed_request");
});

Deno.test("verifyAppleJws: a non-JSON body surfaces verbatim", async () => {
  // A proxy error page or an HTML 502 must not be reported as a verdict.
  reset();
  nextResponse = { status: 502, body: { __raw: true } };
  globalThis.fetch = (): Promise<Response> =>
    Promise.resolve(
      new Response("<html>502 Bad Gateway</html>", { status: 502 }),
    );

  const error = await assertRejects(
    () => verifyAppleJws(WELL_FORMED_JWS),
    Error,
  );
  assertStringIncludes(error.message, "non-JSON");

  // Restore the recording stub for the remaining tests.
  globalThis.fetch = realFetch as typeof globalThis.fetch;
  Object.defineProperty(globalThis, "fetch", {
    value: (input: unknown, init?: RequestInit): Promise<Response> => {
      const headers: Record<string, string> = {};
      for (
        const [key, value] of Object.entries(
          (init?.headers ?? {}) as Record<string, string>,
        )
      ) {
        headers[key.toLowerCase()] = String(value);
      }
      recorded.push({
        url: String(input),
        method: init?.method ?? "GET",
        headers,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const response = nextResponse ?? { status: 200, body: {} };
      nextResponse = null;
      return Promise.resolve(
        new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    writable: true,
    configurable: true,
  });
});

// ── App Attest ────────────────────────────────────────────────────────

Deno.test("verifyAppAttest: sends the composed appId when given one", async () => {
  reset();
  nextResponse = {
    status: 200,
    body: {
      verified: true,
      keyId: "deadbeef",
      publicKeySec1: "04aabb",
      signCount: 1,
      anchorFingerprint: "abc",
      chainLength: 3,
    },
  };

  const result = await verifyAppAttest(
    WELL_FORMED_JWS,
    "challenge-value",
    "club.foodshare.app",
    "TEAMID123.club.foodshare.app",
  );

  assertEquals(result.keyId, "deadbeef");
  assertEquals(result.signCount, 1);

  const body = recorded[0].body as Record<string, string>;
  assertEquals(body.bundleId, "club.foodshare.app");
  assertEquals(body.appId, "TEAMID123.club.foodshare.app");
  assertEquals(body.challenge, "challenge-value");
});

Deno.test("verifyAppAttest: omits appId when not supplied", async () => {
  reset();
  nextResponse = {
    status: 200,
    body: {
      verified: true,
      keyId: "deadbeef",
      publicKeySec1: "04aabb",
      signCount: 1,
      anchorFingerprint: "abc",
      chainLength: 3,
    },
  };

  await verifyAppAttest(WELL_FORMED_JWS, "c", "club.foodshare.app");

  const body = recorded[0].body as Record<string, string>;
  assertEquals(body.bundleId, "club.foodshare.app");
  assertEquals(body.appId, undefined, "appId must be omitted, not empty");
});

Deno.test("verifyAppAttest: a nonce mismatch is a rejection", async () => {
  reset();
  nextResponse = {
    status: 401,
    body: {
      error: "verification_failed",
      message: "attestation nonce does not match the issued challenge",
    },
  };

  const error = await assertRejects(
    () => verifyAppAttest(WELL_FORMED_JWS, "c", "club.foodshare.app"),
    VerificationRejectedError,
  );
  assert(isRejection(error));
  assertStringIncludes(error.message, "nonce");
});

// ── Assertions ────────────────────────────────────────────────────────

Deno.test("verifyAppAttestAssertion: sends the SEC1 key and appId", async () => {
  reset();
  nextResponse = {
    status: 200,
    body: { verified: true, signCount: 7, userPresent: false },
  };

  const result = await verifyAppAttestAssertion(
    "AQID",
    "04aabbcc",
    "club.foodshare.app",
    "TEAMID123.club.foodshare.app",
  );

  assertEquals(result.signCount, 7);
  assertEquals(result.userPresent, false);

  const body = recorded[0].body as Record<string, string>;
  assertEquals(body.assertion, "AQID");
  assertEquals(body.publicKeySec1, "04aabbcc");
  assertEquals(body.appId, "TEAMID123.club.foodshare.app");
  assertStringIncludes(recorded[0].url, "/internal/verify/app-attest/assertion");
});

// ── Trust anchors ─────────────────────────────────────────────────────

Deno.test("fetchTrustAnchors: reports the configured anchors", async () => {
  reset();
  nextResponse = {
    status: 200,
    body: { fingerprints: ["abc123"], count: 1, configured: true },
  };

  const result = await fetchTrustAnchors();
  assertEquals(result.count, 1);
  assertEquals(result.configured, true);
  assertEquals(result.fingerprints, ["abc123"]);
});

// ── Configuration ─────────────────────────────────────────────────────

Deno.test("a missing INTERNAL_API_TOKEN is a hard failure, not a silent skip", async () => {
  const previous = Deno.env.get("INTERNAL_API_TOKEN");
  Deno.env.delete("INTERNAL_API_TOKEN");
  reset();

  try {
    // Deliberately not an "unavailable": a missing token is a deployment
    // fault that must be impossible to miss, and it must not degrade into
    // an unverified pass.
    const error = await assertRejects(
      () => verifyAppleJws(WELL_FORMED_JWS),
      Error,
    );
    assertStringIncludes(error.message, "INTERNAL_API_TOKEN");
  } finally {
    if (previous !== undefined) Deno.env.set("INTERNAL_API_TOKEN", previous);
  }
});

Deno.test("error classes are distinguishable from a plain Error", () => {
  const rejection = new VerificationRejectedError("s", "c", "m");
  const outage = new InternalServiceUnavailableError("s", "c");

  assert(isRejection(rejection));
  assert(!isRejection(outage));
  assert(isUnavailable(outage));
  assert(!isUnavailable(rejection));

  // Anything else is neither. A caller must not treat an arbitrary bug as
  // a verdict.
  assert(!isRejection(new Error("bug")));
  assert(!isUnavailable(new Error("bug")));
  assert(!isRejection("a string"));
  assert(!isUnavailable(undefined));
});
