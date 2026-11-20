/**
 * SSRF bypass-set test — the acceptance for t_a199d39d.
 *
 * Verifies resolveAndValidateUrl rejects the bypass set BEFORE any fetch,
 * and a public URL passes. Run: deno test --allow-net supabase/functions/__tests__/ssrf-bypass.test.ts
 *
 * The IP-literal cases need no DNS. The DNS-rebind case (attacker.example→internal)
 * requires a live attacker-controlled domain — @verifier's network re-run covers it.
 */
import { assertEquals } from "@std/assert";
import { fetchPinned, resolveAndValidateUrl } from "../_shared/url-validation.ts";

Deno.test("SSRF: RFC1918 Class A rejected", async () => {
  const r = await resolveAndValidateUrl("https://10.0.0.1/");
  assertEquals(r.valid, false, `10.0.0.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: RFC1918 Class C rejected", async () => {
  const r = await resolveAndValidateUrl("https://192.168.1.1/");
  assertEquals(r.valid, false, `192.168.1.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: decimal-127.0.0.1 rejected", async () => {
  // 2130706433 = 127.0.0.1 in decimal
  const r = await resolveAndValidateUrl("https://2130706433/");
  assertEquals(r.valid, false, `decimal-127.0.0.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: IPv4-mapped IPv6 metadata rejected", async () => {
  const r = await resolveAndValidateUrl("https://[::ffff:169.254.169.254]/");
  assertEquals(r.valid, false, `::ffff:169.254.169.254 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: loopback rejected", async () => {
  const r = await resolveAndValidateUrl("https://127.0.0.1/");
  assertEquals(r.valid, false, `127.0.0.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: link-local metadata rejected", async () => {
  const r = await resolveAndValidateUrl("https://169.254.169.254/");
  assertEquals(r.valid, false, `169.254.169.254 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: IPv6 loopback rejected", async () => {
  const r = await resolveAndValidateUrl("https://[::1]/");
  assertEquals(r.valid, false, `::1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: cloud metadata hostname rejected", async () => {
  const r = await resolveAndValidateUrl("https://metadata.google.internal/");
  assertEquals(r.valid, false, `metadata.google.internal should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: public URL passes", async () => {
  // example.com is a public IANA-reserved domain (93.184.216.34)
  const r = await resolveAndValidateUrl("https://example.com/");
  assertEquals(r.valid, true, `example.com should pass, got: ${r.reason}`);
});

// --- HTTP-internal cases (allowHttp:true — the IP check must fire on HTTP too) ---
// @reviewer/@cybersecurity: both fetch paths pass allowHttp:true, so the resolved-IP
// check is the SOLE SSRF barrier and must be PROVEN on HTTP, not just read.

Deno.test("SSRF: HTTP RFC1918 rejected (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://10.0.0.1/", { allowHttp: true });
  assertEquals(r.valid, false, `http://10.0.0.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: HTTP link-local metadata rejected (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://169.254.169.254/", { allowHttp: true });
  assertEquals(r.valid, false, `http://169.254.169.254 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: HTTP IPv4-mapped metadata rejected (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://[::ffff:169.254.169.254]/", { allowHttp: true });
  assertEquals(
    r.valid,
    false,
    `http://[::ffff:169.254.169.254] should be rejected, got: ${r.reason}`,
  );
});

Deno.test("SSRF: HTTP loopback rejected (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://127.0.0.1/", { allowHttp: true });
  assertEquals(r.valid, false, `http://127.0.0.1 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: HTTP decimal-127.0.0.1 rejected (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://2130706433/", { allowHttp: true });
  assertEquals(r.valid, false, `http://2130706433 should be rejected, got: ${r.reason}`);
});

Deno.test("SSRF: HTTP public URL passes (allowHttp)", async () => {
  const r = await resolveAndValidateUrl("http://example.com/", { allowHttp: true });
  assertEquals(r.valid, true, `http://example.com should pass, got: ${r.reason}`);
});

// --- Fail-closed invariant: valid return ALWAYS carries resolvedIps ---
// @cybersecurity finding 1: the callers refuse if resolvedIps is absent (never
// fall back to the unpinned URL). This invariant proves a valid return always
// carries the pin, so the fail-closed check is a safety net, not a live bypass.

Deno.test("SSRF: valid return always carries resolvedIps (pin invariant)", async () => {
  for (const u of ["https://example.com/", "https://1.1.1.1/", "http://example.com/"]) {
    const r = await resolveAndValidateUrl(u, { allowHttp: true });
    if (r.valid) {
      assertEquals(
        Array.isArray(r.resolvedIps) && r.resolvedIps.length > 0,
        true,
        `valid return for ${u} must carry resolvedIps (fail-closed pin invariant)`,
      );
    }
  }
});

// --- fetchPinned FETCH tests (the fetch actually runs — @verifier 1388) ---
// These exercise the real fetch path, not just validation. A local target server
// proves the lookup pins the connection to the validated IP:
//  (A) a non-resolvable *.invalid host → only the lookup can connect it.
//  (B) example.com with validatedIp=127.0.0.1 → the pin overrides real DNS (rebind-sim).

async function withLocalServer(
  fn: (port: number) => Promise<void>,
): Promise<void> {
  // Start a local HTTP server on a random port
  const ac = new AbortController();
  let resolvePort: (p: number) => void;
  const portPromise = new Promise<number>((r) => (resolvePort = r));
  const server = Deno.serve(
    { port: 0, signal: ac.signal, onListen: ({ port }) => resolvePort(port) },
    () => new Response("PINNED-TARGET-OK", { status: 200 }),
  );
  const port = await portPromise;
  try {
    await fn(port);
  } finally {
    ac.abort();
    await server.finished;
  }
}

Deno.test("fetchPinned: non-resolvable host connects via lookup (pin proof)", async () => {
  await withLocalServer(async (port) => {
    // *.invalid does NOT resolve via DNS — a successful connect can ONLY come
    // from the custom lookup pinning to 127.0.0.1.
    const resp = await fetchPinned(
      `http://nonresolvable-host.invalid:${port}/`,
      "127.0.0.1",
      { timeout: 5_000 },
    );
    assertEquals(resp.status, 200, `non-resolvable host should connect via lookup`);
    const body = await resp.text();
    assertEquals(body, "PINNED-TARGET-OK", "fetch must land on the pinned target");
  });
});

Deno.test("fetchPinned: rebind-sim — pin overrides example.com real DNS", async () => {
  await withLocalServer(async (port) => {
    // example.com normally resolves to a public IP; pinning to 127.0.0.1 must
    // override that (the rebind-proof: fetch lands on the validated IP).
    const resp = await fetchPinned(
      `http://example.com:${port}/`,
      "127.0.0.1",
      { timeout: 5_000 },
    );
    assertEquals(resp.status, 200, "rebind-sim: pin must override real DNS");
    const body = await resp.text();
    assertEquals(body, "PINNED-TARGET-OK", "fetch must land on the pinned target, not example.com");
  });
});

Deno.test("fetchPinned: redirect rejected (redirect:error)", async () => {
  const ac = new AbortController();
  let resolvePort: (p: number) => void;
  const portPromise = new Promise<number>((r) => (resolvePort = r));
  const server = Deno.serve(
    { port: 0, signal: ac.signal, onListen: ({ port }) => resolvePort(port) },
    () => new Response(null, { status: 302, headers: { Location: "http://169.254.169.254/" } }),
  );
  const port = await portPromise;
  try {
    let threw = false;
    try {
      await fetchPinned(`http://redirect-source.invalid:${port}/`, "127.0.0.1", { timeout: 5_000 });
    } catch (_e) {
      threw = true;
    }
    assertEquals(threw, true, "fetchPinned must reject redirects (not follow to metadata)");
  } finally {
    ac.abort();
    await server.finished;
  }
});
