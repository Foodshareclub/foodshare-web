/**
 * Service authentication for the database-trigger routes.
 *
 * The database posts to /trigger/<type> through Kong. Kong rewrites the Host
 * header to the upstream it proxies to, so by the time the request reaches
 * this function the Host is "functions:9000" — not "kong:8000". A trigger
 * that sends no credential at all is therefore rejected, which is exactly
 * what every database webhook was answered with until the triggers were
 * given the internal service secret.
 *
 * These tests pin the behaviour that matters:
 *   - the internal service secret authenticates;
 *   - the service role key authenticates;
 *   - a wrong credential does not;
 *   - a credential-less request from the database's own network does not
 *     either, because the Host it arrives with is not one the bypass knows.
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { authenticate } from "../api-v1-notifications/lib/auth.ts";

const INTERNAL_SECRET = "internal-secret-for-tests";
const SERVICE_KEY = "service-role-key-for-tests";

function withEnv<T>(fn: () => T): T {
  const previous = {
    internal: Deno.env.get("INTERNAL_SERVICE_SECRET"),
    service: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  };
  Deno.env.set("INTERNAL_SERVICE_SECRET", INTERNAL_SECRET);
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY);
  try {
    return fn();
  } finally {
    if (previous.internal === undefined) Deno.env.delete("INTERNAL_SERVICE_SECRET");
    else Deno.env.set("INTERNAL_SERVICE_SECRET", previous.internal);
    if (previous.service === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", previous.service);
  }
}

function request(headers: Record<string, string>): Request {
  return new Request(
    "http://functions:9000/api-v1-notifications/trigger/new-user",
    { method: "POST", headers: { "content-type": "application/json", ...headers } },
  );
}

Deno.test("service auth: the internal service secret authenticates", async () => {
  const result = await withEnv(() =>
    authenticate(request({ authorization: `Bearer ${INTERNAL_SECRET}` }), "service")
  );
  assertEquals(result.authenticated, true);
});

Deno.test("service auth: the service role key authenticates", async () => {
  const result = await withEnv(() =>
    authenticate(request({ authorization: `Bearer ${SERVICE_KEY}` }), "service")
  );
  assertEquals(result.authenticated, true);
});

Deno.test("service auth: the internal secret is also accepted as an api key", async () => {
  const result = await withEnv(() =>
    authenticate(request({ "x-webhook-secret": INTERNAL_SECRET }), "service")
  );
  assertEquals(result.authenticated, true);
});

Deno.test("service auth: a wrong credential does not authenticate", async () => {
  const result = await withEnv(() =>
    authenticate(request({ authorization: "Bearer not-the-secret" }), "service")
  );
  assertEquals(result.authenticated, false);
});

Deno.test("service auth: a credential-less database request does not authenticate", async () => {
  // Kong delivers the request with the upstream's Host header, so the
  // internal-network bypass does not apply. This is the request the
  // database used to make, and the answer it used to get.
  const result = await withEnv(() => authenticate(request({}), "service"));
  assertEquals(result.authenticated, false);
  assertEquals(result.error, "Missing Authorization or API key header");
});

Deno.test("service auth: the anonymous key is not a service credential", async () => {
  const result = await withEnv(() =>
    authenticate(request({ apikey: "anon-key" }), "service")
  );
  assertEquals(result.authenticated, false);
  assertEquals(result.error, "Invalid service credentials");
});
