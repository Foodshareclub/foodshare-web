/**
 * downloadImage / probeImageUrl — the SSRF gate (rework criterion (b)).
 *
 * Both were named bare fetches in the round-1 review: redirect:error and a
 * timeout, nothing else — no pre-fetch resolution, no IP pin. These tests pin
 * the gate at the two surfaces, hermetically: a private resolution is
 * rejected BEFORE any fetch (the ai-image-verify.test.ts pattern), a blocked
 * hostname and an IPv4-mapped IPv6 literal are rejected statically, and both
 * surfaces are https-only. The public end-to-end pass (real fetchPinned 200
 * on a public A+AAAA host) is proven at the primitive level by
 * ssrf-bypass.test.ts — the estate suite does not open a network connection
 * from these files.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { downloadImage } from "../_shared/image-utils.ts";
import { probeImageUrl } from "../api-v1-images/lib/cover-ensure.ts";

// ---------------------------------------------------------------------------
// DNS stub — indirect reference: the repo tsrs shim's Deno surface lacks
// resolveDns (baselined in typecheck-baseline.json for url-validation.ts),
// so the property must never be read directly at the type level. The runtime
// (real Deno) provides it.
// ---------------------------------------------------------------------------
const denoShim = Deno as unknown as {
  resolveDns?: (_name: string, _type: "A" | "AAAA") => Promise<string[]>;
};
type DnsStub = NonNullable<typeof denoShim.resolveDns>;

function stubDns(address: string): () => void {
  const original = denoShim.resolveDns;
  denoShim.resolveDns =
    ((_name: string, _type: "A" | "AAAA") =>
      Promise.resolve(_type === "A" ? [address] : [])) as DnsStub;
  return () => {
    denoShim.resolveDns = original;
  };
}

// ---------------------------------------------------------------------------
// Fetch harness — records every globalThis.fetch call. The SSRF-gated
// download does NOT use globalThis.fetch (fetchPinned connects to the pinned
// IP directly), so an empty log proves nothing was fetched at all.
// ---------------------------------------------------------------------------
interface FetchCall {
  url: string;
}
function installFetch(
  handler: (url: string) => Response,
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url });
    return Promise.resolve(handler(url));
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = real;
    },
  };
}

const PRIVATE_IP = "10.2.3.4";

Deno.test("downloadImage: a private resolved IP is rejected before any fetch", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    await assertRejects(
      () => downloadImage("https://imghost.example/photos/x.jpg"),
      Error,
      "URL rejected",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("downloadImage: a blocked hostname (cloud metadata) is rejected statically", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    await assertRejects(
      () => downloadImage("https://metadata.google.internal/latest/meta-data/"),
      Error,
      "URL rejected",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("downloadImage: an IPv4-mapped IPv6 literal is normalized and rejected", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    await assertRejects(
      () => downloadImage("https://[::ffff:169.254.169.254]/latest/meta-data/"),
      Error,
      "URL rejected",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("downloadImage: the http scheme is rejected before any fetch (https-only)", async () => {
  const restoreDns = stubDns("93.184.216.34");
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    await assertRejects(
      () => downloadImage("http://imghost.example/photos/x.jpg"),
      Error,
      "URL rejected",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("probeImageUrl: a private resolved IP is dead, and nothing is fetched", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    const alive = await probeImageUrl("https://imghost.example/photos/x.jpg");
    assertEquals(alive, false, "a private resolution can never be live");
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("probeImageUrl: the http scheme is dead without any resolution (https-only)", async () => {
  // A public A record for the host does not help: https-only is decided
  // before the URL is even validated, so no DNS lookup and no fetch occur.
  const restoreDns = stubDns("93.184.216.34");
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    const alive = await probeImageUrl("http://imghost.example/photos/x.jpg");
    assertEquals(alive, false);
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("probeImageUrl: a malformed URL is dead, not a crash", async () => {
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  try {
    assertEquals(await probeImageUrl("not a url"), false);
    assertEquals(await probeImageUrl("javascript:alert(1)"), false);
  } finally {
    harness.restore();
  }
  assertEquals(harness.calls.length, 0);
});
