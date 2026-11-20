/**
 * STAGING TEST ARTIFACT — SSRF pin deployed-runtime proof (TEST-B).
 * NOT a production endpoint. Service-auth gated. Remove after the proof lands.
 *
 * Purpose: prove the deployed edge-runtime's node: compat invokes the custom
 * `lookup` as a FULL DNS REPLACEMENT for RESOLVABLE hosts (not fallback-only).
 * This is @verifier's TEST-B ruling (1397) — the sole remaining line to close
 * t_a199d39d. TEST-A (non-resolvable host) is insufficient: a fallback-only
 * runtime passes TEST-A but ignores the pin for resolvable hosts.
 *
 * How the operator runs it (see scripts/ssrf-pin-test.md):
 *   1. Start the staging target server at a reachable IP (returns a marker).
 *   2. Deploy this function to the edge-runtime (v1.70.1).
 *   3. POST { host: "example.com", pin_ip: "<target-ip>", port: <target-port> }.
 *   4. PASS iff body == the target's marker (pin overrode example.com's real DNS).
 *      FAIL if body == example.com's real content (fallback-only → rebind open).
 *
 * The function calls fetchPinned DIRECTLY (bypassing resolveAndValidateUrl) so
 * the pin_ip can be any reachable IP (e.g. the staging target). It returns the
 * fetched body + status so the operator can compare against the target marker.
 *
 * @module _staging-ssrf-pin-test
 */

import { fetchPinned } from "../_shared/url-validation.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request): Promise<Response> => {
  // Service-auth gate: this is a test artifact, never public.
  const auth = req.headers.get("authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  if (!SERVICE_KEY || (bearer !== SERVICE_KEY && apikey !== SERVICE_KEY)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const host = String(body.host ?? "example.com");
  const pinIp = String(body.pin_ip ?? "");
  const port = Number(body.port ?? 80);
  const scheme = String(body.scheme ?? "http");

  if (!pinIp) {
    return new Response(JSON.stringify({ error: "pin_ip required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TEST-B: resolvable host + pin to the staging target. If the runtime honors
  // the lookup as a full replacement, the fetch lands on pinIp (the target).
  // If fallback-only, it lands on host's real DNS (example.com) → FAIL.
  const url = `${scheme}://${host}:${port}/`;
  try {
    const resp = await fetchPinned(url, pinIp, { timeout: 10_000 });
    const text = await resp.text();
    return new Response(
      JSON.stringify({
        test: "TEST-B resolvable-host override",
        requested_host: host,
        pin_ip: pinIp,
        fetch_status: resp.status,
        // The operator compares body against the staging target's marker.
        body: text.slice(0, 2000),
        body_length: text.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        test: "TEST-B resolvable-host override",
        requested_host: host,
        pin_ip: pinIp,
        fetch_error: String(err).slice(0, 500),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
});