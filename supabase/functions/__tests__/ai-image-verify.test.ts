/**
 * imageVerify — the AI vision gate with a provenance tie (the verify stage of
 * the real-photograph pipeline).
 *
 * Pins the lead's close criteria (ruling 2026-11-19) against the ratified
 * a1-first / gated-a2 / fetchPinned design (0e35376c):
 *   (a) pass requires is_real_photo AND vision matches_listing AND score > 0.7
 *       AND a provenance tie to THIS specific listing;
 *   (b) "matches" means THIS facility — provenance-grounded (source domain,
 *       host company, own-presence URLs, or EXIF GPS); a real photo of a
 *       different, merely similar facility is rejected;
 *   (d) the Gemini path receives the actually-fetched bytes (inline_data),
 *       never empty data + a URL as text.
 *
 * Plus the architect addendum: stock/placeholder bytes are a HARD reject by
 * perceptual hash BEFORE any vision quota is spent — the test asserts the
 * vision endpoint is never called.
 *
 * SSRF: the verify fetch routes through resolveAndValidateUrl + fetchPinned
 * (the @cybersecurity-reviewed primitive, ssrf-bypass.test.ts). The private-
 * resolution tests here run the REAL gate (no fetch seam) and prove the
 * reject happens before any fetch. Verdict-logic tests inject fixture bytes
 * via ImageVerifyDeps (the ImageSearchDeps pattern); production calls use the
 * real gated fetch.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  enrichListing,
  imageVerify,
  type ImageVerifyInput,
  type ImageVerifyResult,
} from "../api-v1-ai/lib/providers/image-pipeline.ts";

const FIX = "__tests__/fixtures/";
const PUBLIC_IP = "93.184.216.34"; // example.com (IANA-reserved, public)
const PRIVATE_IP = "10.2.3.4";

// ---------------------------------------------------------------------------
// Env scoping (estate pattern: restore in finally)
// ---------------------------------------------------------------------------
async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<unknown>,
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

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
// Fetch harness — records every globalThis.fetch call (vision endpoints).
// The SSRF-gated image fetch does NOT use globalThis.fetch (node:https via
// fetchPinned), so this log proves vision/no-vision, not image bytes.
// ---------------------------------------------------------------------------
interface FetchCall {
  url: string;
  init?: RequestInit;
}
function installFetch(
  handler: (url: string, init?: RequestInit) => Response,
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push({ url, init });
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = real;
    },
  };
}

function visionJson(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    is_real_photo: true,
    matches_listing: true,
    signage_matches_name: true,
    is_outdoor_physical: true,
    score: 0.92,
    description: "Fridge unit on a residential street.",
    ...over,
  });
}

function openaiResponse(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function geminiResponse(text: string): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// Supabase stub — inference_cache always misses (the module-level memory LRU
// is separate and unique per test material); posts/community_fridges are
// driven by the per-test rows; storage + posts.update are captured.
// ---------------------------------------------------------------------------
interface Captured {
  uploads: Array<{ path: string; type: string }>;
  postUpdates: Record<string, unknown>[];
  selects: Record<string, string[]>;
}

function stubSupabase(
  post: Record<string, unknown>,
  fridge: Record<string, unknown> | null,
  captured: Captured,
) {
  const thenable = (value: Record<string, unknown>) => ({
    ...value,
    then: (res: (v: unknown) => unknown) => {
      res(value);
      return thenable(value);
    },
    catch: () => thenable(value),
  });
  return {
    from(table: string) {
      // supabase-js exposes update/upsert directly off from(); setCachedResult
      // upserts without a select — mirror the real builder shape.
      const upsert = () => thenable({});
      const update = (payload: Record<string, unknown>) => {
        captured.postUpdates.push(payload);
        const builder = {
          eq: () => builder,
          select: () => builder,
          single: () => Promise.resolve({ data: post, error: null }),
        };
        return builder;
      };
      const select = (cols: string) => {
        (captured.selects[table] ??= []).push(cols);
        if (table === "posts") {
          return {
            eq: () => ({
              single: () => Promise.resolve({ data: post, error: null }),
            }),
          };
        }
        if (table === "community_fridges") {
          return {
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: fridge, error: null }),
            }),
          };
        }
        if (table === "inference_cache") {
          return {
            eq: () => ({
              gte: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            upsert,
          };
        }
        throw new Error(`unexpected table: ${table}`);
      };
      if (table === "posts") return { select, update, upsert };
      return { select, upsert };
    },
    storage: {
      from: () => ({
        upload: (path: string, _blob: Blob, opts: { contentType: string }) =>
          Promise.resolve(
            (captured.uploads.push({ path, type: opts.contentType }), { error: null }),
          ),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://foodshare.club/storage/posts/${path}` },
        }),
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// verify-sample.jpg — synthetic multi-hue gradient (dHash far from the
//   stock corpus: 52 / 17 bits), no EXIF.
// verify-exif-gps.jpg — same image + EXIF GPS 38.6523 N / 121.2899 W.
// stock-placeholder-fridge.jpg — a recode of the estate placeholder
//   foodshare-web/public/placeholders/fridge.jpg (dHash == corpus entry,
//   distance 0).
async function sampleBytes(): Promise<Uint8Array> {
  return new Uint8Array(await Deno.readFile(FIX + "verify-sample.jpg"));
}
async function exifBytes(): Promise<Uint8Array> {
  return new Uint8Array(await Deno.readFile(FIX + "verify-exif-gps.jpg"));
}
async function stockBytes(): Promise<Uint8Array> {
  return new Uint8Array(await Deno.readFile(FIX + "stock-placeholder-fridge.jpg"));
}

function chunkedBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const JPEG_MAGIC = new Uint8Array([
  0xff,
  0xd8,
  0xff,
  0xe0,
  0x00,
  0x10,
  0x4a,
  0x46,
  0x49,
  0x46,
  0x00,
  0x01,
]);

// ---------------------------------------------------------------------------
// The listing shared across tests (unique URLs keep the verify cache apart).
// ---------------------------------------------------------------------------
const LISTING = {
  name: "Parnell Community Fridge",
  address: "12 Parnell St, Fair Oaks, CA",
  website: "https://parnellfridge.example",
  lat: 38.6523,
  lng: -121.2899,
};

function verifyInput(over: Partial<ImageVerifyInput> = {}): ImageVerifyInput {
  return {
    image_url: "https://photos.example.net/verify-a/fridge-a.jpg",
    listing_name: LISTING.name,
    listing_address: LISTING.address,
    post_type: "fridge",
    ...over,
  };
}

async function runVerify(
  input: ImageVerifyInput,
  bytes: Uint8Array,
  vision: Record<string, unknown> = {},
  env: Record<string, string | undefined> = { OPENAI_API_KEY: "test-openai" },
): Promise<{ result: ImageVerifyResult; calls: FetchCall[] }> {
  const harness = installFetch((url) => {
    if (url.startsWith("https://api.openai.com")) {
      return openaiResponse(visionJson(vision));
    }
    if (url.startsWith("https://generativelanguage.googleapis.com")) {
      return geminiResponse(visionJson(vision));
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  const captured: Captured = { uploads: [], postUpdates: [], selects: {} };
  let result!: ImageVerifyResult;
  try {
    await withEnv(env, async () => {
      result = await imageVerify(
        input,
        stubSupabase({}, null, captured),
        {
          fetchImage: async () => ({ bytes, format: "jpeg" }),
        },
      );
    });
  } finally {
    harness.restore();
  }
  return { result, calls: harness.calls };
}

// ===========================================================================
// (a) + (b) — the pass formula and the provenance tie
// ===========================================================================

Deno.test("imageVerify: a real photo of the WRONG facility never passes (crux)", async () => {
  // Vision says everything true at high confidence — but the source domain
  // ties to nothing about this listing, and the image carries no EXIF GPS.
  const { result, calls } = await runVerify(
    verifyInput({
      image_url: "https://unrelated-host.example/photos/fridge-b.jpg",
      source_url: "https://unrelated-host.example/photos/fridge-b.jpg",
      listing_website: LISTING.website,
    }),
    await sampleBytes(),
    { score: 0.95 },
  );
  assertEquals(result.pass, false, "no provenance tie → no pass, whatever the score");
  assertEquals(result.matches_listing, false);
  assertEquals(result.is_real_photo, true);
  assertEquals(result.score, 0.95);
  assertEquals(result.provenance.tie, false);
  assertEquals(result.provenance.basis, "none");
  assertEquals(result.provenance.source_domain, "unrelated-host.example");
  assert(calls.length === 1, "exactly one vision call");
});

Deno.test("imageVerify: a source-domain tie to the listing website passes", async () => {
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/fridge-c.jpg",
      source_url: "https://www.parnellfridge.example/photos/fridge-c.jpg",
      listing_website: LISTING.website,
    }),
    await sampleBytes(),
  );
  assertEquals(result.pass, true);
  assertEquals(result.matches_listing, true);
  assertEquals(result.provenance.tie, true);
  assertEquals(result.provenance.basis, "listing_website");
  // www. is canonicalized in the recorded domain.
  assertEquals(result.provenance.source_domain, "parnellfridge.example");
});

Deno.test("imageVerify: a host-company domain tie passes without a website", async () => {
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://cdn.parnellfridge.example/img/fridge-d.jpg",
      source_url: "https://cdn.parnellfridge.example/img/fridge-d.jpg",
      host_company: "Parnell Fridge",
    }),
    await sampleBytes(),
  );
  assertEquals(result.pass, true);
  assertEquals(result.provenance.basis, "host_company");
});

Deno.test("imageVerify: EXIF GPS at the listing coordinates ties (auxiliary signal)", async () => {
  // Unrelated domain, no website tie — the geotag alone carries the tie.
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://photo-exchange.example/photos/fridge-e.jpg",
      source_url: "https://photo-exchange.example/photos/fridge-e.jpg",
      listing_website: LISTING.website,
      listing_lat: LISTING.lat,
      listing_lng: LISTING.lng,
    }),
    await exifBytes(),
  );
  assertEquals(result.pass, true);
  assertEquals(result.provenance.basis, "exif_gps");
});

Deno.test("imageVerify: EXIF GPS outside the tie radius does not tie", async () => {
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://photo-exchange.example/photos/fridge-f.jpg",
      source_url: "https://photo-exchange.example/photos/fridge-f.jpg",
      listing_website: LISTING.website,
      // ~100km from the fixture's geotag.
      listing_lat: 37.8,
      listing_lng: -122.4,
    }),
    await exifBytes(),
  );
  assertEquals(result.pass, false);
  assertEquals(result.provenance.basis, "none");
});

Deno.test("imageVerify: pass requires vision matches_listing (not just the tie)", async () => {
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/fridge-g.jpg",
      source_url: "https://www.parnellfridge.example/photos/fridge-g.jpg",
      listing_website: LISTING.website,
    }),
    await sampleBytes(),
    { matches_listing: false },
  );
  assertEquals(result.pass, false);
  assertEquals(result.matches_listing, false);
  assertEquals(result.provenance.tie, true, "the tie held; the vision verdict failed");
});

Deno.test("imageVerify: pass requires score strictly above 0.7", async () => {
  const low = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/fridge-h.jpg",
      source_url: "https://www.parnellfridge.example/photos/fridge-h.jpg",
      listing_website: LISTING.website,
    }),
    await sampleBytes(),
    { score: 0.69 },
  );
  assertEquals(low.result.pass, false);

  const at = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/fridge-i.jpg",
      source_url: "https://www.parnellfridge.example/photos/fridge-i.jpg",
      listing_website: LISTING.website,
    }),
    await sampleBytes(),
    { score: 0.7 },
  );
  assertEquals(at.result.pass, false, "the threshold is strict: > 0.7");
});

// ===========================================================================
// Architect addendum — stock/placeholder hard reject before vision spend
// ===========================================================================

Deno.test("imageVerify: stock/placeholder bytes are hard-rejected BEFORE any vision call", async () => {
  const { result, calls } = await runVerify(
    verifyInput({
      image_url: "https://stock-cdn.example/placeholder/fridge-stock.jpg",
      source_url: "https://stock-cdn.example/placeholder/fridge-stock.jpg",
      listing_website: LISTING.website,
    }),
    await stockBytes(),
  );
  assertEquals(result.pass, false);
  assertEquals(result.model, "stock-dedup");
  assertEquals(result.stock_rejected, true);
  assertEquals(result.score, 0);
  assertEquals(result.provenance.basis, "none");
  assertEquals(result.perceptual_hash, "f3f3f3f3bfffedfd", "the corpus dHash");
  assertEquals(
    calls.filter((c) => c.url.startsWith("https://api.openai.com")).length,
    0,
    "no vision spend: the corpus reject precedes the model call",
  );
  assertEquals(
    calls.filter((c) => c.url.startsWith("https://generativelanguage.googleapis.com")).length,
    0,
    "no vision spend: no fallback either",
  );
});

// ===========================================================================
// (d) — Gemini receives the actually-fetched bytes
// ===========================================================================

Deno.test("imageVerify: Gemini fallback receives the fetched bytes in inline_data", async () => {
  const bytes = await sampleBytes();
  const { result, calls } = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/fridge-j.jpg",
      source_url: "https://www.parnellfridge.example/photos/fridge-j.jpg",
      listing_website: LISTING.website,
    }),
    bytes,
    {},
    { OPENAI_API_KEY: undefined, GEMINI_API_KEY: "test-gemini" },
  );
  assertEquals(result.pass, true);
  assertEquals(result.model, "gemini-1.5-flash");
  const geminiCalls = calls.filter((c) =>
    c.url.startsWith("https://generativelanguage.googleapis.com")
  );
  assertEquals(geminiCalls.length, 1);
  assert(calls.every((c) => !c.url.startsWith("https://api.openai.com")));
  const body = JSON.parse(String(geminiCalls[0].init?.body)) as {
    contents: Array<{ parts: Array<Record<string, unknown>> }>;
  };
  const parts = body.contents[0].parts;
  const inline = parts.find((p) => "inline_data" in p) as
    | { inline_data: { mime_type: string; data: string } }
    | undefined;
  assert(inline, "the request must carry an inline_data part");
  assertEquals(inline.inline_data.mime_type, "image/jpeg");
  assertEquals(
    inline.inline_data.data,
    chunkedBase64(bytes),
    "inline_data must be the actually-fetched bytes, base64 — never empty",
  );
  assert(
    !parts.some((p) => typeof p.text === "string" && p.text.includes("Image URL:")),
    "the old empty-data + URL-as-text construction is gone",
  );
});

// ===========================================================================
// Size floor
// ===========================================================================

Deno.test("imageVerify: bytes below the 5KB floor fail closed at the size guard", async () => {
  const tiny = new Uint8Array([...JPEG_MAGIC, 1, 2, 3, 4]); // 16B of JPEG magic
  const { result } = await runVerify(
    verifyInput({
      image_url: "https://www.parnellfridge.example/photos/icon-k.jpg",
      source_url: "https://www.parnellfridge.example/photos/icon-k.jpg",
      listing_website: LISTING.website,
    }),
    tiny,
  );
  assertEquals(result.pass, false);
  assertEquals(result.model, "size-guard");
  assertEquals(result.is_real_photo, false);
});

// ===========================================================================
// SSRF — the real gate (no fetch seam): private resolution never fetched
// ===========================================================================

Deno.test("imageVerify: a private resolved IP is rejected before any fetch", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  const captured: Captured = { uploads: [], postUpdates: [], selects: {} };
  try {
    await assertRejects(
      async () =>
        await withEnv({ OPENAI_API_KEY: "test-openai" }, () =>
          imageVerify(
            verifyInput({
              image_url: "https://imghost.example/photos/fridge-ssrf.jpg",
              source_url: "https://imghost.example/photos/fridge-ssrf.jpg",
              listing_website: LISTING.website,
            }),
            stubSupabase({}, null, captured),
          )),
      Error,
      "Image URL rejected",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0, "nothing was fetched");
});

Deno.test("imageVerify: a blocked hostname (cloud metadata) is rejected statically", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const harness = installFetch(() => {
    throw new Error("no network I/O is permitted in this test");
  });
  const captured: Captured = { uploads: [], postUpdates: [], selects: {} };
  try {
    await assertRejects(
      async () =>
        await withEnv({ OPENAI_API_KEY: "test-openai" }, () =>
          imageVerify(
            verifyInput({
              image_url: "http://metadata.google.internal/latest/meta-data/",
            }),
            stubSupabase({}, null, captured),
          )),
      Error,
      "Hostname is blocked",
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  assertEquals(harness.calls.length, 0);
});

// ===========================================================================
// enrichListing — orchestrator: a1 place with auditable provenance
// ===========================================================================

const A1_HTML = `
<!doctype html>
<html>
  <head>
    <meta property="og:image" content="https://www.parnellfridge.example/photos/fridge-own.jpg">
  </head>
  <body>
    <img src="/img/fridge-secondary.jpg">
    <img src="https://other-cdn.example/shared/fridge-logo.png">
  </body>
</html>`;

function enrichPost(over: Record<string, unknown> = {}) {
  return {
    id: 7,
    version: 1,
    post_name: LISTING.name,
    post_address: LISTING.address,
    post_type: "fridge",
    fridge_id: 42,
    website: LISTING.website,
    linktree: null,
    metadata: null,
    images: [],
    ...over,
  };
}

const FRIDGE_ROW = {
  id: 42,
  city: "Fair Oaks",
  state: "CA",
  host_company: null,
  latitude: LISTING.lat,
  longitude: LISTING.lng,
  photo_url: null,
};

async function runEnrich(
  post: Record<string, unknown>,
  fridge: Record<string, unknown> | null,
  vision: Record<string, unknown> = {},
  html: string = A1_HTML,
  env: Record<string, string | undefined> = {
    OPENAI_API_KEY: "test-openai",
    ALLOW_SERP_FALLBACK: undefined,
  },
  readPlacedCover?: (url: string) => Promise<Uint8Array>,
) {
  const restoreDns = stubDns(PUBLIC_IP);
  const harness = installFetch((url) => {
    if (url.startsWith("https://api.openai.com")) return openaiResponse(visionJson(vision));
    if (url.startsWith("https://serpapi.com")) {
      throw new Error("SERP must not run without the operator gate");
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  const captured: Captured = { uploads: [], postUpdates: [], selects: {} };
  const supabase = stubSupabase(post, fridge, captured);
  const bytes = await sampleBytes();
  let result!: Awaited<ReturnType<typeof enrichListing>>;
  try {
    await withEnv(
      { SUPABASE_PUBLIC_URL: "https://api.foodshare.club", ...env },
      () =>
        enrichListing(
          { post_id: 7 },
          supabase,
          {
            readPlacedCover: readPlacedCover ?? (async () => bytes),
            fetchImage: async () => ({ bytes, format: "jpeg" }),
            fetchHtml: async () => html,
            fetchBytes: async () => ({ bytes, contentType: "image/jpeg" }),
          },
        ).then((r) => (result = r)),
    );
  } finally {
    restoreDns();
    harness.restore();
  }
  return { result, captured, calls: harness.calls };
}

Deno.test("enrichListing: a1 own-site photo places with an auditable provenance record", async () => {
  const { result, captured } = await runEnrich(enrichPost(), FRIDGE_ROW);
  assertEquals(result.status, "placed");
  assert(result.image_url?.startsWith("https://foodshare.club/storage/posts/"));
  // The a1 tier found the og:image (own domain) + the relative <img> (own
  // domain); the foreign-CDN logo was excluded by the own-domain rule.
  assert(captured.selects.community_fridges[0].includes("latitude"));
  assert(captured.selects.community_fridges[0].includes("host_company"));
  assertEquals(captured.uploads.length, 1);
  const prov = result.provenance as Record<string, unknown>;
  assertEquals(prov.source_url, "https://www.parnellfridge.example/photos/fridge-own.jpg");
  assertEquals(prov.source_domain, "parnellfridge.example");
  assertEquals(prov.signal_basis, "listing_website");
  assertEquals(prov.status, "placed");
  // The DB update carries the same record.
  const update = captured.postUpdates[0];
  const metadata = update.metadata as Record<string, unknown>;
  const dbProv = metadata.image_provenance as Record<string, unknown>;
  assertEquals(dbProv.signal_basis, "listing_website");
  assertEquals(dbProv.source_domain, "parnellfridge.example");
  assertEquals((update.images as string[])[0], result.image_url);
});

Deno.test("enrichListing: own-site replacement archives the displaced full-gallery photo", async () => {
  const images = [
    "https://old.example/one.jpg",
    "https://old.example/two.jpg",
    "https://old.example/three.jpg",
  ];
  const archived = "https://old.example/earlier.jpg";
  const { result, captured } = await runEnrich(
    enrichPost({
      images,
      metadata: { owner_note: "keep", cover_image_archive: [archived, images[0]] },
    }),
    FRIDGE_ROW,
  );
  assertEquals(result.status, "placed");
  const update = captured.postUpdates[0];
  assertEquals(update.images, [result.image_url, images[0], images[1]]);
  const metadata = update.metadata as Record<string, unknown>;
  assertEquals(metadata.cover_image_archive, [archived, ...images]);
  assertEquals(metadata.owner_note, "keep");
});

Deno.test("enrichListing: a wrong-facility verdict never places (orchestrator-level crux)", async () => {
  // Unique candidate URL + listing name: the verify cache is keyed on the
  // full provenance envelope, so the placement test's verdict must not be
  // inherited here.
  const { result, captured } = await runEnrich(
    enrichPost({ post_name: "Wrong Facility Fridge" }),
    FRIDGE_ROW,
    { matches_listing: false, is_real_photo: true, score: 0.93 },
    A1_HTML.replace("fridge-own.jpg", "fridge-own-wrong.jpg"),
  );
  assertEquals(result.status, "fell_through");
  assert(result.error?.includes("no candidate passed verification"));
  assertEquals(captured.uploads.length, 0, "nothing reaches storage");
  assertEquals(captured.postUpdates.length, 0, "the listing is not mutated");
});

Deno.test("enrichListing: the a2 tier is operator-gated — no SERP without consent", async () => {
  // No website → a1 has nothing; a2 must stay dark without ALLOW_SERP_FALLBACK.
  const { result, calls } = await runEnrich(
    enrichPost({ website: null }),
    FRIDGE_ROW,
  );
  assertEquals(result.status, "fell_through");
  assert(result.error?.includes("a2 gated"));
  assertEquals(calls.filter((c) => c.url.startsWith("https://serpapi.com")).length, 0);
});

Deno.test("enrichListing: a1 success + provisioned SERP key + gate ON → placed, zero SERP", async () => {
  // The consent direction, pinned at the orchestrator: a provisioned SERP key
  // is a capability, not a source decision. With the operator word present
  // AND a1 already holding an own-site candidate, the gated a2 tier must not
  // even fire — the SERP endpoint is never contacted.
  const { result, captured, calls } = await runEnrich(
    enrichPost(),
    FRIDGE_ROW,
    {},
    A1_HTML,
    {
      OPENAI_API_KEY: "test-openai",
      SERPAPI_API_KEY: "test-serp",
      ALLOW_SERP_FALLBACK: "true",
    },
  );
  assertEquals(result.status, "placed");
  assertEquals(captured.uploads.length, 1, "the a1 image is stored");
  const prov = result.provenance as Record<string, unknown>;
  assertEquals(prov.source, "a1-own-domain", "the placed image is the a1 candidate");
  assertEquals(
    calls.filter((c) => c.url.startsWith("https://serpapi.com")).length,
    0,
    "SERP is a gated fallback: a1 success must not touch it",
  );
});

Deno.test("enrichListing: an already-placed listing is skipped (idempotency)", async () => {
  const { result, captured } = await runEnrich(
    enrichPost({
      metadata: {
        image_provenance: { status: "placed", source_url: "https://old.example/x.jpg" },
      },
      images: ["https://api.foodshare.club/storage/v1/object/public/posts/already.jpg"],
    }),
    FRIDGE_ROW,
  );
  assertEquals(result.status, "skipped");
  assertEquals(captured.uploads.length, 0);
  assertEquals(captured.postUpdates.length, 0);
});

for (const failure of ["unavailable", "not-raster"] as const) {
  Deno.test(`enrichListing: placed ${failure} primary is repaired despite a live secondary`, async () => {
    const primary = "https://api.foodshare.club/storage/v1/object/public/posts/broken.jpg";
    const secondary = "https://api.foodshare.club/storage/v1/object/public/posts/secondary.jpg";
    const reads: string[] = [];
    const { result, captured } = await runEnrich(
      enrichPost({
        metadata: { image_provenance: { status: "placed" } },
        images: [primary, secondary],
      }),
      FRIDGE_ROW,
      {},
      A1_HTML,
      { OPENAI_API_KEY: "test-openai", ALLOW_SERP_FALLBACK: undefined },
      async (url) => {
        reads.push(url);
        if (failure === "unavailable") throw new Error("HTTP 402");
        return new TextEncoder().encode("<html>not an image</html>");
      },
    );
    assertEquals(reads, [primary]);
    assertEquals(result.status, "placed");
    assertEquals(captured.uploads.length, 1);
    assertEquals(captured.postUpdates.length, 1);
    assertEquals((captured.postUpdates[0].images as string[]).slice(1), [primary, secondary]);
  });
}

Deno.test("enrichListing: placed legacy storage is repaired without fetching the legacy URL", async () => {
  const reads: string[] = [];
  const { result, captured } = await runEnrich(
    enrichPost({
      metadata: { image_provenance: { status: "placed" } },
      images: ["https://iazmjdjwnkilycbjwpzp.supabase.co/storage/v1/object/public/posts/old.jpg"],
    }),
    FRIDGE_ROW,
    {},
    A1_HTML,
    { OPENAI_API_KEY: "test-openai", ALLOW_SERP_FALLBACK: undefined },
    (url) => {
      reads.push(url);
      throw new Error("Legacy URLs must not reach the primary storage readback");
    },
  );
  assertEquals(result.status, "placed");
  assertEquals(captured.uploads.length, 1);
  assertEquals(reads, []);
});
