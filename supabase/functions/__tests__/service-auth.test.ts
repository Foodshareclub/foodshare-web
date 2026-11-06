/**
 * Service authentication tests.
 *
 * The important regression is the third one: `X-Supabase-Cron: true` used to
 * authenticate every service route. A header the caller writes is not a
 * credential.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { requireServiceAuth, verifyServiceAuth } from "../_shared/service-auth.ts";
import { ForbiddenError } from "../_shared/errors.ts";

function request(headers: Record<string, string>): Request {
  return new Request("https://api.example.test/internal", {
    method: "POST",
    headers,
  });
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test("service-auth: accepts X-Cron-Secret", () => {
  withEnv({ CRON_SECRET: "cron-secret-value" }, () => {
    assertEquals(
      verifyServiceAuth(request({ "x-cron-secret": "cron-secret-value" })),
      true,
    );
  });
});

Deno.test("service-auth: accepts the cron secret as a bearer token", () => {
  withEnv({ CRON_SECRET: "cron-secret-value" }, () => {
    assertEquals(
      verifyServiceAuth(request({ authorization: "Bearer cron-secret-value" })),
      true,
    );
  });
});

Deno.test("service-auth: rejects X-Supabase-Cron", () => {
  withEnv({ CRON_SECRET: "cron-secret-value", SUPABASE_SERVICE_ROLE_KEY: "role-key" }, () => {
    assertEquals(verifyServiceAuth(request({ "x-supabase-cron": "true" })), false);
  });
});

Deno.test("service-auth: accepts the service-role key", () => {
  withEnv({ CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: "role-key" }, () => {
    assertEquals(
      verifyServiceAuth(request({ authorization: "Bearer role-key" })),
      true,
    );
  });
});

Deno.test("service-auth: rejects a wrong or empty credential", () => {
  withEnv({ CRON_SECRET: "cron-secret-value", SUPABASE_SERVICE_ROLE_KEY: "role-key" }, () => {
    assertEquals(verifyServiceAuth(request({ "x-cron-secret": "wrong" })), false);
    assertEquals(verifyServiceAuth(request({ "x-cron-secret": "" })), false);
    assertEquals(verifyServiceAuth(request({ authorization: "Bearer " })), false);
    assertEquals(verifyServiceAuth(request({})), false);
  });
});

Deno.test("service-auth: fails closed when no secret is configured", () => {
  withEnv({ CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, () => {
    // An empty presented value must not match an empty expected value.
    assertEquals(verifyServiceAuth(request({ "x-cron-secret": "" })), false);
    assertEquals(verifyServiceAuth(request({ authorization: "Bearer " })), false);
  });
});

Deno.test("service-auth: requireServiceAuth throws ForbiddenError", () => {
  withEnv({ CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, () => {
    assertThrows(
      () => requireServiceAuth(request({})),
      ForbiddenError,
    );
  });
});
