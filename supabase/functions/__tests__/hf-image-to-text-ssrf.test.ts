/**
 * imageToText imageUrl fetch — the SSRF gate (card t_2f579451, finding F2).
 *
 * Hermetic: DNS and the pinned socket are stubbed; globalThis.fetch is
 * poisoned so any raw fetch fails the test.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { ValidationError } from "../_shared/errors.ts";
import { fetchImageBlob } from "../api-v1-ai/lib/providers/huggingface.ts";

const denoShim = Deno as unknown as {
  resolveDns?: (_name: string, _type: "A" | "AAAA") => Promise<string[]>;
  connect?: (opts: unknown) => Promise<unknown>;
  startTls?: (c: unknown, o?: unknown) => Promise<unknown>;
  createSecureConn?: (c: unknown, o?: unknown) => Promise<unknown>;
};

// deno-lint-ignore no-explicit-any
type Anyfn = any;

function stubDns(address: string): () => void {
  const original = denoShim.resolveDns;
  denoShim.resolveDns =
    ((_n: string, t: "A" | "AAAA") => Promise.resolve(t === "A" ? [address] : [])) as Anyfn;
  return () => {
    denoShim.resolveDns = original;
  };
}

/** Poison fetch and count pinned socket connects. */
function harness(response?: Uint8Array) {
  const realFetch = globalThis.fetch;
  const realConnect = denoShim.connect;
  const realTls = denoShim.startTls;
  const realSecure = denoShim.createSecureConn;
  const state = { fetches: 0, connects: [] as string[] };
  globalThis.fetch = (() => {
    state.fetches++;
    throw new Error("raw fetch is forbidden");
  }) as Anyfn;
  denoShim.connect = (opts: unknown) => {
    state.connects.push((opts as { hostname: string }).hostname);
    if (!response) return Promise.reject(new Error("no network I/O permitted"));
    let off = 0;
    const conn = {
      read(buf: Uint8Array) {
        if (off >= response.length) return Promise.resolve(null);
        const n = Math.min(buf.length, response.length - off);
        buf.set(response.subarray(off, off + n));
        off += n;
        return Promise.resolve(n);
      },
      write: (b: Uint8Array) => Promise.resolve(b.length),
      close() {},
    };
    return Promise.resolve(conn);
  };
  denoShim.startTls = (c: unknown) => Promise.resolve(c);
  denoShim.createSecureConn = undefined;
  return {
    state,
    restore() {
      globalThis.fetch = realFetch;
      denoShim.connect = realConnect;
      denoShim.startTls = realTls;
      denoShim.createSecureConn = realSecure;
    },
  };
}

function httpResponse(body: Uint8Array, extra = ""): Uint8Array {
  const head = new TextEncoder().encode(
    `HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: ${body.length}\r\n${extra}Connection: close\r\n\r\n`,
  );
  const out = new Uint8Array(head.length + body.length);
  out.set(head);
  out.set(body, head.length);
  return out;
}

async function expectRejectedPreFetch(url: string, dns: string) {
  const restoreDns = stubDns(dns);
  const h = harness();
  try {
    await assertRejects(
      () => fetchImageBlob(url),
      ValidationError,
      "imageUrl could not be fetched",
    );
  } finally {
    restoreDns();
    h.restore();
  }
  assertEquals(h.state.fetches, 0, "no raw fetch");
  assertEquals(h.state.connects.length, 0, "no socket opened");
}

Deno.test("imageToText fetch: private resolved IP rejected before any connection", async () => {
  await expectRejectedPreFetch("https://imghost.example/x.png", "10.2.3.4");
});

Deno.test("imageToText fetch: cloud-metadata hostname rejected", async () => {
  await expectRejectedPreFetch(
    "https://metadata.google.internal/latest/meta-data/",
    "93.184.216.34",
  );
  await expectRejectedPreFetch("https://169.254.169.254/latest/meta-data/", "93.184.216.34");
});

Deno.test("imageToText fetch: http scheme rejected", async () => {
  await expectRejectedPreFetch("http://imghost.example/x.png", "93.184.216.34");
});

Deno.test("imageToText fetch: oversized body is capped", async () => {
  const restoreDns = stubDns("93.184.216.34");
  const big = new Uint8Array(10 * 1024 * 1024 + 1024);
  const h = harness(httpResponse(big));
  try {
    await assertRejects(() => fetchImageBlob("https://imghost.example/big.png"), ValidationError);
  } finally {
    restoreDns();
    h.restore();
  }
  assertEquals(h.state.fetches, 0);
});

Deno.test("imageToText fetch: valid public image returns its bytes via the pinned IP", async () => {
  const restoreDns = stubDns("93.184.216.34");
  const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const h = harness(httpResponse(body));
  try {
    const blob = await fetchImageBlob("https://imghost.example/ok.png");
    assertEquals(new Uint8Array(await blob.arrayBuffer()), body);
  } finally {
    restoreDns();
    h.restore();
  }
  assertEquals(h.state.fetches, 0, "no raw fetch");
  assertEquals(h.state.connects, ["93.184.216.34"], "connected to the validated IP");
});
