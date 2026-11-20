/**
 * STAGING TEST ARTIFACT — SSRF pin deployed-runtime proof (TEST-B).
 * NOT a production endpoint. Service-auth gated. Remove after the proof lands.
 *
 * Purpose: prove the deployed edge-runtime (v1.70.1) connects to the
 * VALIDATED IP for RESOLVABLE hosts — @verifier's TEST-B ruling (1397), the
 * sole remaining line to close t_a199d39d.
 *
 * Mechanism history: the first probe on v1.70.1 (2026-11-20) showed the
 * node:https `lookup` pin is ERR_NOT_IMPLEMENTED there — a hard error, so
 * fetchPinned's pin is now a DIRECT Deno.connect to the validated IP (no DNS
 * resolution at fetch time at all; SNI/cert on the original hostname, strict).
 * TEST-B still proves the property that matters — for a RESOLVABLE host
 * (example.com) the fetched body must be the staging target's marker, i.e.
 * the connection went to pin_ip. With a direct connect there is no
 * fallback-only semantics to hide: the hostname is never resolved at fetch
 * time. TEST-A (non-resolvable host) is the sanity check, not the close.
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

// The deployed box's .env.functions carries SERVICE_ROLE_KEY (no
// SUPABASE_ prefix); local runs use the prefixed name. Accept either.
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

// Deployed-env hardening: this artifact ships as a live test function, so
// its attack surface is pinned to the estate's own staging addresses. A
// leaked key must not become an SSRF oracle: pin_ip is allow-listed
// (127.0.0.1, the podman bridge GW, the box tailnet IP), host is limited to
// the TEST-A/TEST-B domains, scheme is http.
const ALLOWED_PIN_IPS = new Set(["127.0.0.1", "10.89.0.1", "100.92.38.119"]);

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

  if (!pinIp || !ALLOWED_PIN_IPS.has(pinIp)) {
    return new Response(
      JSON.stringify({ error: "pin_ip required and must be in the staging allow-list" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  // TEST-A/B domains only: resolvable example.com (TEST-B) or a
  // non-resolvable *.invalid (TEST-A). No open proxy.
  if (host !== "example.com" && !host.endsWith(".invalid")) {
    return new Response(
      JSON.stringify({ error: "host must be example.com or a *.invalid name" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (scheme !== "http") {
    return new Response(
      JSON.stringify({ error: "scheme must be http (staging target is plain http)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // TEST-B: resolvable host + pin to the staging target. fetchPinned opens
  // the connection DIRECTLY to pin_ip (no DNS at fetch time), so the only
  // way the body can be the marker is that the connection went to pin_ip —
  // a resolvable hostname cannot stand in for it.
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
