/**
 * place-cover tests — pipeline orchestration (crawl → verify → fetch → place),
 * service auth, idempotency, the subject+provenance placement gate, SSRF
 * pre-filtering, per-stage timeout fall-through, provenance records, and the
 * covers-wave generation → title-card floor.
 */

import { assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import {
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  ValidationError,
} from "../_shared/errors.ts";
import type { Json } from "../_shared/database.types.ts";
import {
  candidateSourceDomain,
  type CrawlInput,
  type CrawlResult,
  defaultPlaceCoverDependencies,
  domainTieBasis,
  fetchableCandidate,
  handlePlaceCover,
  isLadderFloor,
  isPlaceholderLike,
  MAX_VERIFY_CANDIDATES,
  PIPELINE_DEADLINE_MS,
  type PlaceCoverCandidate,
  type PlaceCoverDependencies,
  type PlaceCoverListing,
  type PlaceCoverOutcome,
  placeCoverPipeline,
  verifyGate,
  type VerifyInput,
  type VerifyResult,
} from "../api-v1-images/lib/place-cover.ts";
import { ensureCoverLadder } from "../api-v1-images/lib/cover-ensure.ts";
import { renderTitleCard } from "../api-v1-images/lib/cover-title-card.ts";
import { postBodySchema } from "../api-v1-ai/lib/schemas.ts";
import { rasterType } from "../api-v1-products/lib/listing-cover.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";
const SERVICE_KEY = "test-service-role-key";
const CRON_KEY = "test-cron-secret";
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const PLACEHOLDER = "https://cdn.foodshare.club/images/placeholder-fridge.png";
const STORED_BASE = "https://api.foodshare.club/storage/v1/object/public/posts";

const goodCandidate: PlaceCoverCandidate = {
  url: "https://example.org/photos/fridge.jpg",
  source: "example.org",
  title: "The fridge",
};

const passVerdict: VerifyResult = {
  pass: true,
  score: 0.9,
  is_real_photo: true,
  matches_listing: true,
  model: "gpt-4o",
};

function baseListing(overrides: Partial<PlaceCoverListing> = {}): PlaceCoverListing {
  return {
    id: 7,
    profile_id: OWNER,
    post_name: "Parnell Community Fridge",
    post_description: "A community fridge outside the library",
    post_type: "fridge",
    images: [PLACEHOLDER],
    metadata: null,
    website: "https://example.org",
    post_address: "1 Main St, Auckland",
    ...overrides,
  };
}

interface UpdateCall {
  listingId: number;
  images: string[];
  metadata: Json;
}

function pipelineDeps(overrides: Partial<PlaceCoverDependencies> = {}) {
  const stored = new Map<string, Uint8Array>();
  const calls = {
    crawl: [] as CrawlInput[],
    verify: [] as VerifyInput[],
    fetch: [] as string[],
    store: [] as string[],
    remove: [] as string[],
    updates: [] as UpdateCall[],
    ladder: 0,
    alive: [] as string[],
  };
  const clock = { t: 1_000_000 };
  const deps: PlaceCoverDependencies = {
    crawl: (input) => {
      calls.crawl.push(input);
      return Promise.resolve({ candidates: [goodCandidate], query: "test" } as CrawlResult);
    },
    verify: (input) => {
      calls.verify.push(input);
      return Promise.resolve({ ...passVerdict });
    },
    fetchBytes: (url) => {
      calls.fetch.push(url);
      return Promise.resolve(new Uint8Array(pngBytes));
    },
    store: (path, bytes) => {
      calls.store.push(path);
      const url = `${STORED_BASE}/${path}`;
      stored.set(url, bytes);
      return Promise.resolve(url);
    },
    readback: (url) => {
      const bytes = stored.get(url);
      if (!bytes) return Promise.reject(new Error("readback 404"));
      return Promise.resolve(bytes);
    },
    remove: (path) => {
      calls.remove.push(path);
      stored.delete(`${STORED_BASE}/${path}`);
      return Promise.resolve();
    },
    ladder: (input, ownerId) => {
      calls.ladder++;
      return ensureCoverLadder(input, ownerId, {
        isAlive: () => Promise.resolve(false),
        generate: () => Promise.reject(new Error("generation unavailable")),
        render: (title, description) => renderTitleCard(title, description),
        store: deps.store,
        verify: deps.readback,
        remove: deps.remove,
      });
    },
    isAlive: (url) => {
      calls.alive.push(url);
      return Promise.resolve(false);
    },
    updateCover: (listingId, images, metadata) => {
      calls.updates.push({ listingId, images, metadata });
      return Promise.resolve();
    },
    now: () => clock.t,
    ...overrides,
  };
  return { deps, calls, stored, clock };
}

function provenanceOf(update: UpdateCall): Record<string, unknown> {
  const meta = update.metadata as Record<string, unknown>;
  return meta.image_provenance as Record<string, unknown>;
}

/** Narrows the pipeline outcome to the fell-through variant. */
function asFellThrough(outcome: PlaceCoverOutcome) {
  assertEquals(outcome.status, "fell-through");
  return outcome as Extract<PlaceCoverOutcome, { status: "fell-through" }>;
}

// ---------------------------------------------------------------------------
// Gate + helper units
// ---------------------------------------------------------------------------

Deno.test("verifyGate: requires the full conjunction, score strictly above 0.7", () => {
  assertEquals(verifyGate(passVerdict), true);
  assertEquals(verifyGate({ ...passVerdict, matches_listing: false }), false);
  assertEquals(verifyGate({ ...passVerdict, is_real_photo: false }), false);
  assertEquals(verifyGate({ ...passVerdict, pass: false }), false);
  assertEquals(verifyGate({ ...passVerdict, score: 0.7 }), false);
  assertEquals(verifyGate({ ...passVerdict, score: 0.71 }), true);
  // Amended gate: a provenance verdict must tie; fail-closed on tie=false.
  assertEquals(
    verifyGate({
      ...passVerdict,
      provenance: { tie: true, basis: "listing_website", source_domain: "example.org" },
    }),
    true,
  );
  assertEquals(
    verifyGate({
      ...passVerdict,
      provenance: { tie: false, basis: "none", source_domain: "news.example.com" },
    }),
    false,
  );
});
Deno.test("fetchableCandidate: https public image URLs pass; SSRF targets are rejected", () => {
  assertEquals(fetchableCandidate(goodCandidate), true);
  assertEquals(fetchableCandidate({ url: "http://example.org/photos/fridge.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "https://169.254.169.254/latest/meta-data/" }), false);
  assertEquals(fetchableCandidate({ url: "https://10.0.0.1/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "https://192.168.1.1/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "https://localhost/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "https://metadata.google.internal/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "ftp://example.org/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "https://user:pass@example.org/x.jpg" }), false);
  assertEquals(fetchableCandidate({ url: "" }), false);
});

Deno.test("placeholder and ladder-floor classification", () => {
  assertEquals(isPlaceholderLike(PLACEHOLDER), true);
  assertEquals(isPlaceholderLike("https://cdn.foodshare.club/PLACEHOLDER-foodbank.png"), true);
  assertEquals(isPlaceholderLike("https://example.org/photos/fridge.jpg"), false);
  assertEquals(isLadderFloor(`${STORED_BASE}/${OWNER}/cover-ensure/abc.png`), true);
  assertEquals(isLadderFloor(`${STORED_BASE}/${OWNER}/place-cover/abc.jpg`), true);
  assertEquals(isLadderFloor(`${STORED_BASE}/${OWNER}/reference-covers/abc.jpg`), true);
  assertEquals(isLadderFloor("https://example.org/photos/fridge.jpg"), false);
});

Deno.test("domainTieBasis: own-website, host-listing-photo, and serp-verified evidence", () => {
  const listing = baseListing();
  assertEquals(domainTieBasis(goodCandidate, listing), "own-website:example.org");
  assertEquals(
    domainTieBasis({ url: "https://www.example.org/a.jpg", source: "www.example.org" }, listing),
    "own-website:example.org",
  );
  assertEquals(
    domainTieBasis({ url: "https://sub.example.org/a.jpg" }, listing),
    "own-website:example.org",
  );
  assertEquals(
    domainTieBasis({ url: "https://host.org/a.jpg", source: "host.org" }, {
      ...listing,
      website: "-",
      hostPhotoUrl: "https://host.org/photo.jpg",
    }),
    "host-listing-photo:host.org",
  );
  assertEquals(
    domainTieBasis({ url: "https://news.example.com/a.jpg", source: "news.example.com" }, listing),
    "serp-verified:news.example.com",
  );
  assertEquals(candidateSourceDomain({ url: "https://a.com/x.jpg", source: "b.com" }), "b.com");
  assertEquals(candidateSourceDomain({ url: "https://a.com/x.jpg" }), "a.com");
});

// ---------------------------------------------------------------------------
// Pipeline — happy path and the placement gate
// ---------------------------------------------------------------------------

Deno.test("pipeline: crawl → verify → fetch → place writes images[0] and full provenance", async () => {
  const { deps, calls } = pipelineDeps();
  const listing = baseListing();
  const outcome = await placeCoverPipeline(listing, deps);

  assertEquals(outcome.status, "placed");
  assertEquals(calls.crawl.length, 1);
  assertEquals(calls.crawl[0].name, listing.post_name);
  assertEquals(calls.crawl[0].post_type, "fridge");
  assertEquals(calls.crawl[0].website, "https://example.org");
  assertEquals(calls.verify.length, 1);
  assertEquals(calls.verify[0].image_url, goodCandidate.url);
  assertEquals(calls.verify[0].listing_address, listing.post_address);
  assertEquals(calls.verify[0].listing_website, "https://example.org");
  assertEquals(calls.fetch, [goodCandidate.url]);
  assertEquals(calls.updates.length, 1);

  const update = calls.updates[0];
  assertEquals(update.listingId, 7);
  assertEquals(update.images[0], outcome.url);
  assertEquals(update.images[0].startsWith(`${STORED_BASE}/${OWNER}/place-cover/`), true);
  assertEquals(update.images[0].endsWith(".png"), true);

  const prov = provenanceOf(update);
  assertEquals(prov.status, "placed");
  assertEquals(prov.source_kind, "crawl");
  assertEquals(prov.source_url, goodCandidate.url);
  assertEquals(prov.source_domain, "example.org");
  assertEquals(prov.domain_tie_basis, "own-website:example.org");
  assertEquals(prov.signal_basis, "vision-conjunction");
  assertEquals(prov.verify_provenance, null);
  assertEquals(prov.verify_score, 0.9);
  assertEquals(prov.verify_model, "gpt-4o");
  assertEquals(typeof prov.crawled_at, "string");
  assertEquals(typeof prov.placed_at, "string");
});

Deno.test("pipeline: a wrong-location verdict (matches_listing=false) never places", async () => {
  const { deps, calls } = pipelineDeps({
    verify: () => Promise.resolve({ ...passVerdict, matches_listing: false }),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "no-candidate-verified");
  assertEquals(calls.fetch.length, 0);
  assertEquals(calls.ladder, 1);
  assertEquals(provenanceOf(calls.updates[0]).status, "fell-through");
});
Deno.test("pipeline: a stock-photo verdict (is_real_photo=false) never places", async () => {
  const { deps, calls } = pipelineDeps({
    verify: () => Promise.resolve({ ...passVerdict, is_real_photo: false }),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  asFellThrough(outcome);
  assertEquals(calls.fetch.length, 0);
});
Deno.test("pipeline: first candidate fails the gate, second places", async () => {
  const second: PlaceCoverCandidate = {
    url: "https://example.org/second.jpg",
    source: "example.org",
  };
  let verifyCalls = 0;
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [goodCandidate, second] }),
    verify: (input) => {
      verifyCalls++;
      return Promise.resolve(
        input.image_url === goodCandidate.url
          ? { ...passVerdict, matches_listing: false }
          : { ...passVerdict },
      );
    },
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  assertEquals(outcome.status, "placed");
  assertEquals(outcome.candidatesTried, 2);
  assertEquals(verifyCalls, 2);
  assertEquals(calls.fetch, [second.url]);
  assertEquals(provenanceOf(calls.updates[0]).source_url, second.url);
});

Deno.test("pipeline: amended provenance verdict places and records signal_basis", async () => {
  const verdict: VerifyResult = {
    ...passVerdict,
    provenance: { tie: true, basis: "listing_website", source_domain: "example.org" },
  };
  const { deps, calls } = pipelineDeps({ verify: () => Promise.resolve(verdict) });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  assertEquals(outcome.status, "placed");
  const prov = provenanceOf(calls.updates[0]);
  assertEquals(prov.status, "placed");
  assertEquals(prov.signal_basis, "listing_website");
  assertEquals(prov.verify_provenance, {
    tie: true,
    basis: "listing_website",
    source_domain: "example.org",
  });
});

Deno.test("pipeline: a provenance verdict without a tie never places (fail-closed)", async () => {
  const { deps, calls } = pipelineDeps({
    verify: () =>
      Promise.resolve({
        ...passVerdict,
        provenance: { tie: false, basis: "none", source_domain: "news.example.com" },
      }),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "no-candidate-verified");
  assertEquals(calls.fetch.length, 0);
});
Deno.test("pipeline: verify receives the location's own-presence context", async () => {
  const { deps, calls } = pipelineDeps();
  await placeCoverPipeline(
    baseListing({ hostCompany: "Example Org", latitude: -36.85, longitude: 174.76 }),
    deps,
  );
  assertEquals(calls.verify[0].listing_website, "https://example.org");
  assertEquals(calls.verify[0].host_company, "Example Org");
  assertEquals(calls.verify[0].listing_lat, -36.85);
  assertEquals(calls.verify[0].listing_lng, 174.76);
  // A placeholder website carries no domain and is not sent.
  const bare = pipelineDeps();
  await placeCoverPipeline(baseListing({ website: "-" }), bare.deps);
  assertEquals(bare.calls.verify[0].listing_website, undefined);
});

Deno.test("pipeline: at most MAX_VERIFY_CANDIDATES candidates are verified", async () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    url: `https://example.org/p${i}.jpg`,
    source: "example.org",
  }));
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: many }),
    verify: (input) => {
      calls.verify.push(input);
      return Promise.resolve({ ...passVerdict, matches_listing: false });
    },
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  asFellThrough(outcome);
  assertEquals(calls.verify.length, MAX_VERIFY_CANDIDATES);
});

// ---------------------------------------------------------------------------
// Pipeline — SSRF pre-filter, fetch failures, readback, deadlines
// ---------------------------------------------------------------------------

Deno.test("pipeline: SSRF candidates are filtered before any verify call", async () => {
  const { deps, calls } = pipelineDeps({
    crawl: () =>
      Promise.resolve({
        candidates: [
          { url: "https://169.254.169.254/latest/meta-data/iam.jpg" },
          { url: "http://10.0.0.1/internal.jpg" },
          { url: "https://localhost/x.jpg" },
        ],
      }),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "no-candidates");
  assertEquals(calls.verify.length, 0);
  assertEquals(calls.fetch.length, 0);
});
Deno.test("pipeline: a fetch failure moves to the next candidate", async () => {
  const second: PlaceCoverCandidate = { url: "https://example.org/ok.jpg", source: "example.org" };
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [goodCandidate, second] }),
    fetchBytes: (url) => {
      calls.fetch.push(url);
      if (url === goodCandidate.url) return Promise.reject(new Error("download 403"));
      return Promise.resolve(new Uint8Array(pngBytes));
    },
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  assertEquals(outcome.status, "placed");
  assertEquals(outcome.candidatesTried, 2);
  assertEquals(provenanceOf(calls.updates[0]).source_url, second.url);
});

Deno.test("pipeline: readback hash mismatch rejects the candidate without deleting a shared object", async () => {
  const { deps, calls } = pipelineDeps();
  const realReadback = deps.readback;
  // Tamper only the candidate readback; the floor's readback must stay valid.
  deps.readback = (url) =>
    url.includes("/place-cover/")
      ? Promise.resolve(new Uint8Array([1, 2, 3, 4]))
      : realReadback(url);
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "fetch-failed");
  assertEquals(calls.remove, []);
});
Deno.test("pipeline: non-image bytes are rejected by raster validation", async () => {
  const { deps, calls } = pipelineDeps({
    fetchBytes: () => Promise.resolve(new TextEncoder().encode("<html>not an image</html>")),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "fetch-failed");
  // No candidate object is stored; only the title-card floor may land.
  assertEquals(calls.store.every((p) => !p.includes("/place-cover/")), true);
});
Deno.test("pipeline: the deadline stops verification and falls through", async () => {
  const { deps, calls, clock } = pipelineDeps();
  const start = clock.t;
  let first = true;
  deps.now = () => {
    if (first) {
      first = false;
      return start;
    }
    return start + PIPELINE_DEADLINE_MS;
  };
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "pipeline-timeout");
  assertEquals(calls.verify.length, 0);
});
Deno.test("pipeline: crawl failure falls through with reason crawl-failed", async () => {
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.reject(new Error("SERP unavailable")),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "crawl-failed");
  assertEquals(calls.verify.length, 0);
});
Deno.test("pipeline: verify failure falls through with reason verify-failed", async () => {
  const { deps } = pipelineDeps({
    verify: () => Promise.reject(new Error("vision timeout")),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.reason, "verify-failed");
});

// ---------------------------------------------------------------------------
// Pipeline — fall-through floor and persistence semantics
// ---------------------------------------------------------------------------

Deno.test("pipeline: fall-through lands on the title-card floor with fell-through provenance", async () => {
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [] }),
  });
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.tier, 3);
  assertEquals(ft.reason, "no-candidates");
  assertEquals(ft.cover?.kind, "title-card");
  assertEquals(rasterType(await deps.readback(outcome.url)), "png");

  const update = calls.updates[0];
  assertEquals(update.images[0], outcome.url);
  const prov = provenanceOf(update);
  assertEquals(prov.status, "fell-through");
  assertEquals(prov.source_kind, "placeholder-title-card");
  assertEquals(prov.tier, 3);
  assertEquals(prov.reason, "no-candidates");
  assertEquals((prov.cover as Record<string, unknown>).kind, "title-card");
  assertEquals(typeof prov.attempted_at, "string");
});
Deno.test("pipeline: fall-through uses generation (tier 2) when available", async () => {
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [] }),
  });
  deps.ladder = (input, ownerId) => {
    calls.ladder++;
    return ensureCoverLadder(input, ownerId, {
      isAlive: () => Promise.resolve(false),
      generate: () => Promise.resolve(new Uint8Array(pngBytes)),
      render: (title, description) => renderTitleCard(title, description),
      store: deps.store,
      verify: deps.readback,
      remove: deps.remove,
    });
  };
  const outcome = await placeCoverPipeline(baseListing(), deps);
  const ft = asFellThrough(outcome);
  assertEquals(ft.tier, 2);
  assertEquals(ft.cover?.kind, "generated");
  assertEquals(provenanceOf(calls.updates[0]).source_kind, "generate");
  assertEquals(provenanceOf(calls.updates[0]).tier, 2);
});
Deno.test("pipeline: a broken floor fails loudly", async () => {
  const { deps } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [] }),
    ladder: () => Promise.reject(new ServerError("title-card render failed")),
  });
  await assertRejects(() => placeCoverPipeline(baseListing(), deps), ServerError);
});

Deno.test("pipeline: placed persistence failure retains shared objects and propagates", async () => {
  const { deps, calls } = pipelineDeps({
    updateCover: () => Promise.reject(new DatabaseError("update failed")),
  });
  await assertRejects(() => placeCoverPipeline(baseListing(), deps), DatabaseError);
  assertEquals(calls.remove, []);
});

Deno.test("pipeline: fall-through persistence failure retains the shared floor object", async () => {
  const { deps, calls } = pipelineDeps({
    crawl: () => Promise.resolve({ candidates: [] }),
    updateCover: () => Promise.reject(new DatabaseError("update failed")),
  });
  await assertRejects(() => placeCoverPipeline(baseListing(), deps), DatabaseError);
  assertEquals(calls.remove, []);
});

Deno.test("pipeline: existing non-placeholder images are preserved after the new cover, capped at 3", async () => {
  const keep1 = "https://example.org/real1.jpg";
  const keep2 = "https://example.org/real2.jpg";
  const keep3 = "https://example.org/real3.jpg";
  const { deps, calls } = pipelineDeps();
  const outcome = await placeCoverPipeline(
    baseListing({ images: [PLACEHOLDER, keep1, keep2, keep3] }),
    deps,
  );
  assertEquals(outcome.status, "placed");
  assertEquals(calls.updates[0].images, [outcome.url, keep1, keep2]);
});

Deno.test("pipeline: other metadata keys survive the provenance write", async () => {
  const { deps, calls } = pipelineDeps();
  await placeCoverPipeline(baseListing({ metadata: { custom: "kept", n: 42 } }), deps);
  const meta = calls.updates[0].metadata as Record<string, unknown>;
  assertEquals(meta.custom, "kept");
  assertEquals(meta.n, 42);
  assertEquals((meta.image_provenance as Record<string, unknown>).status, "placed");
});

// ---------------------------------------------------------------------------
// Route handler — auth, guards, idempotency
// ---------------------------------------------------------------------------

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  return fn().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

interface ListingRow {
  id: number;
  profile_id: string;
  post_name: string;
  post_description: string;
  post_type: string;
  images: string[] | null;
  metadata: Json | null;
  website: string;
  post_address: string;
  fridge_id: string | null;
  is_active: boolean;
}

function mockContext(options: {
  headers?: Record<string, string>;
  body?: unknown;
  listing?: ListingRow | null;
  fridge?: {
    city: string | null;
    state: string | null;
    photo_url: string | null;
    host_company?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  updateError?: { message: string } | null;
}) {
  const updates: unknown[] = [];
  const listing = options.listing === undefined
    ? {
      id: 7,
      profile_id: OWNER,
      post_name: "Parnell Community Fridge",
      post_description: "A community fridge outside the library",
      post_type: "fridge",
      images: [PLACEHOLDER],
      metadata: null,
      website: "https://example.org",
      post_address: "1 Main St, Auckland",
      fridge_id: null,
      is_active: true,
    }
    : options.listing;
  const supabase = {
    from: (table: string) => {
      if (table === "community_fridges") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: options.fridge ?? null, error: null }),
            }),
          }),
        };
      }
      if (table !== "posts") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () => Promise.resolve({ data: listing, error: null }),
            }),
          }),
        }),
        update: (payload: unknown) => {
          updates.push(payload);
          return {
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 7 }, error: options.updateError ?? null }),
              }),
            }),
          };
        },
      };
    },
  };
  const ctx = {
    request: new Request("https://api.foodshare.club/functions/v1/api-v1-images/place-cover", {
      method: "POST",
      headers: options.headers ?? {},
    }),
    body: options.body === undefined ? { listingId: 7 } : options.body,
    userId: null,
    supabase,
    ctx: { requestId: "test-request" },
    corsHeaders: {},
  } as unknown as HandlerContext;
  return { ctx, updates };
}

const serviceHeaders = { authorization: `Bearer ${SERVICE_KEY}` };

Deno.test("place-cover: anon and user-JWT callers are rejected before any data access", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps();
    const anon = mockContext({});
    await assertRejects(() => handlePlaceCover(anon.ctx, deps), ForbiddenError);
    const user = mockContext({ headers: { authorization: "Bearer user-jwt-token" } });
    await assertRejects(() => handlePlaceCover(user.ctx, deps), ForbiddenError);
    assertEquals(anon.updates.length, 0);
    assertEquals(calls.crawl.length, 0);
  });
});

Deno.test("place-cover: service key and cron secret are accepted", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: CRON_KEY }, async () => {
    const a = mockContext({ headers: serviceHeaders });
    const responseA = await handlePlaceCover(a.ctx, pipelineDeps().deps);
    assertEquals(responseA.status, 200);
    const b = mockContext({ headers: { "x-cron-secret": CRON_KEY } });
    const responseB = await handlePlaceCover(b.ctx, pipelineDeps().deps);
    assertEquals(responseB.status, 200);
  });
});

Deno.test("place-cover: invalid body is a ValidationError", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    for (const body of [{}, { listingId: "7" }, { listingId: -3 }, { listingId: 1.5 }, null]) {
      const { ctx } = mockContext({ headers: serviceHeaders, body });
      await assertRejects(() => handlePlaceCover(ctx, pipelineDeps().deps), ValidationError);
    }
  });
});

Deno.test("place-cover: missing listing is 404; wrong post type and inactive are 400", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps();
    const missing = mockContext({ headers: serviceHeaders, listing: null });
    await assertRejects(() => handlePlaceCover(missing.ctx, deps), NotFoundError);

    const foodCtx = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Apples",
        post_description: "-",
        post_type: "food",
        images: [],
        metadata: null,
        website: "-",
        post_address: "-",
        fridge_id: null,
        is_active: true,
      },
    });
    await assertRejects(() => handlePlaceCover(foodCtx.ctx, deps), ValidationError);

    const inactiveCtx = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Fridge",
        post_description: "-",
        post_type: "fridge",
        images: [],
        metadata: null,
        website: "-",
        post_address: "-",
        fridge_id: null,
        is_active: false,
      },
    });
    await assertRejects(() => handlePlaceCover(inactiveCtx.ctx, deps), ValidationError);
    assertEquals(calls.crawl.length, 0);
  });
});

Deno.test("place-cover: placed provenance is idempotent — no stage runs, no write", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps();
    const { ctx, updates } = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Fridge",
        post_description: "-",
        post_type: "fridge",
        images: ["https://api.foodshare.club/storage/v1/object/public/posts/x/placed.jpg"],
        metadata: {
          image_provenance: { status: "placed", source_url: "https://example.org/a.jpg" },
        },
        website: "-",
        post_address: "-",
        fridge_id: null,
        is_active: true,
      },
    });
    const response = await handlePlaceCover(ctx, deps);
    assertEquals(response.status, 200);
    const payload = await response.json();
    assertEquals(payload.data.status, "skipped");
    assertEquals(payload.data.reason, "already-placed");
    assertEquals(calls.crawl.length, 0);
    assertEquals(calls.verify.length, 0);
    assertEquals(updates.length, 0);
  });
});

Deno.test("place-cover: a live real cover skips the pipeline", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const live = "https://example.org/user-photo.jpg";
    const { deps, calls } = pipelineDeps({ isAlive: () => Promise.resolve(true) });
    const { ctx, updates } = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Fridge",
        post_description: "-",
        post_type: "fridge",
        images: [live],
        metadata: null,
        website: "-",
        post_address: "-",
        fridge_id: null,
        is_active: true,
      },
    });
    const response = await handlePlaceCover(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.status, "skipped");
    assertEquals(payload.data.reason, "live-cover-present");
    assertEquals(calls.crawl.length, 0);
    assertEquals(updates.length, 0);
  });
});

Deno.test("place-cover: a ladder-floor cover is upgradeable (pipeline runs)", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps({ isAlive: () => Promise.resolve(true) });
    const { ctx } = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Fridge",
        post_description: "-",
        post_type: "fridge",
        images: [`${STORED_BASE}/${OWNER}/cover-ensure/floor.png`],
        metadata: { image_provenance: { status: "fell-through", tier: 3 } },
        website: "-",
        post_address: "-",
        fridge_id: null,
        is_active: true,
      },
    });
    const response = await handlePlaceCover(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.status, "placed");
    assertEquals(calls.crawl.length, 1);
  });
});

Deno.test("place-cover: host-listing context feeds crawl city/state and the provenance tie", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps({
      crawl: (input) => {
        calls.crawl.push(input);
        return Promise.resolve({
          candidates: [{ url: "https://host.org/fridge.jpg", source: "host.org" }],
        });
      },
    });
    const { ctx } = mockContext({
      headers: serviceHeaders,
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Fridge",
        post_description: "-",
        post_type: "fridge",
        images: [PLACEHOLDER],
        metadata: null,
        website: "-",
        post_address: "-",
        fridge_id: "fridge-uuid-1",
        is_active: true,
      },
      fridge: {
        city: "Auckland",
        state: "AUK",
        photo_url: "https://host.org/photo.jpg",
        host_company: "Host Org",
        latitude: -36.85,
        longitude: 174.76,
      },
    });
    const response = await handlePlaceCover(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.status, "placed");
    assertEquals(calls.crawl[0].city, "Auckland");
    assertEquals(calls.crawl[0].state, "AUK");
    assertEquals(payload.data.provenance.domain_tie_basis, "host-listing-photo:host.org");
    assertEquals(calls.verify[0].host_company, "Host Org");
    assertEquals(calls.verify[0].listing_lat, -36.85);
    assertEquals(calls.verify[0].listing_lng, 174.76);
    assertEquals(calls.verify[0].listing_website, undefined);
  });
});

Deno.test("place-cover: fell-through response carries tier, reason, and floor provenance", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = pipelineDeps({ crawl: () => Promise.resolve({ candidates: [] }) });
    const { ctx } = mockContext({ headers: serviceHeaders });
    const response = await handlePlaceCover(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.status, "fell-through");
    assertEquals(payload.data.tier, 3);
    assertEquals(payload.data.reason, "no-candidates");
    assertEquals(calls.updates.length, 1);
    const prov = (calls.updates[0].metadata as Record<string, unknown>)
      .image_provenance as Record<
        string,
        unknown
      >;
    assertEquals(prov.status, "fell-through");
  });
});

Deno.test("place-cover: production fetchBytes rejects SSRF targets before download", async () => {
  const deps = defaultPlaceCoverDependencies({} as never, "test");
  await assertRejects(
    () => deps.fetchBytes("https://169.254.169.254/latest/meta-data/"),
    ValidationError,
  );
  await assertRejects(() => deps.fetchBytes("http://example.org/a.jpg"), ValidationError);
  await assertRejects(() => deps.fetchBytes("https://10.1.2.3/a.jpg"), ValidationError);
});

// ---------------------------------------------------------------------------
// Production wiring: a1-first crawl, operator-gated a2, resolved-IP fetch gate
// ---------------------------------------------------------------------------

// Stubbed DNS + a global-fetch stub keep these hermetic:
//  - the SSRF primitive resolves A/AAAA BEFORE fetching (Deno.resolveDns is
//    stubbed), and a non-public or empty resolution rejects before any
//    network is touched;
//  - the a2 SERP tier is the only stage on global fetch (callAiInference),
//    so it is interceptable;
//  - the pinned download (fetchPinned, t_a199d39d) deliberately bypasses
//    global fetch — node:https with DNS pinned to the validated IP, cert
//    validation never disabled, IP literals rejected — so its success path
//    is network-bound by design. This block pins the GATE around it
//    (reject-before-fetch, fail-closed on empty resolution); live
//    pinned-fetch coverage lives in the ssrf-bypass suite.
const OWN_SITE = "https://ownsite.example";
const OWN_IMAGE = "https://ownsite.example/fridge.jpg";
const IMG_URL = "https://img.example/f.jpg";
const PRIVATE_IP = "10.2.3.4";

function stubDns(address: string | null): () => void {
  // Indirect reference: the repo tsrs shim's Deno surface lacks resolveDns,
  // so the property must never be read directly at the type level. Deno
  // resolveDns resolves to string[] (addresses), not record objects.
  // address === null models an empty (NXDOMAIN) resolution.
  const deno = Deno as unknown as {
    resolveDns?: (_name: string, _type: "A" | "AAAA") => Promise<string[]>;
  };
  const original = deno.resolveDns;
  deno.resolveDns =
    ((_name: string, _type: "A" | "AAAA") =>
      Promise.resolve(_type === "A" && address ? [address] : [])) as NonNullable<
        typeof deno.resolveDns
      >;
  return () => {
    deno.resolveDns = original;
  };
}

function stubFetch(
  handler: (url: string) => Response | Promise<Response>,
): { urls: string[]; restore: () => void } {
  const urls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    return Promise.resolve(handler(url));
  }) as typeof fetch;
  return {
    urls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

Deno.test("production crawl: a1 runs first and fails closed; SERP stays uncalled", async () => {
  // a1Scrape validates the website through the same resolved-IP gate; the
  // private resolution makes it return [] hermetically (no network, no
  // fetch), so the a2 consent-gate decision is observable on its own.
  const restoreDns = stubDns(PRIVATE_IP);
  const stub = stubFetch((url) => {
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    await withEnv({
      ALLOW_SERP_FALLBACK: undefined,
      SUPABASE_URL: "https://api.foodshare.club",
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    }, async () => {
      const deps = defaultPlaceCoverDependencies({} as never, "test");
      const result = await deps.crawl({
        name: "Parnell Community Fridge",
        post_type: "fridge",
        website: OWN_SITE,
        listingId: 7,
      });
      assertEquals(result.candidates.length, 0);
      assertEquals(stub.urls.length, 0);
    });
  } finally {
    stub.restore();
    restoreDns();
  }
});

Deno.test("production crawl: a2 SERP is gated off without the operator's source word", async () => {
  const stub = stubFetch((url) => {
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    await withEnv({
      ALLOW_SERP_FALLBACK: undefined,
      SUPABASE_URL: "https://api.foodshare.club",
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    }, async () => {
      const deps = defaultPlaceCoverDependencies({} as never, "test");
      const result = await deps.crawl({
        name: "Parnell Community Fridge",
        post_type: "fridge",
        listingId: 7,
      });
      assertEquals(result.candidates.length, 0);
      assertEquals(stub.urls.length, 0);
    });
  } finally {
    stub.restore();
  }
});

Deno.test("production crawl: a2 SERP runs only when ALLOW_SERP_FALLBACK=true, after a1 falls through", async () => {
  // a1 runs first and fails closed hermetically (private resolution), then
  // the gated a2 tier is the one global-fetch call.
  const restoreDns = stubDns(PRIVATE_IP);
  const stub = stubFetch((url) => {
    if (url.endsWith("/inference/imageSearch")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            candidates: [{ url: "https://cdn.example.org/f.jpg", source: "example.org" }],
            query: "q",
          },
        }),
        { headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    await withEnv({
      ALLOW_SERP_FALLBACK: "true",
      SUPABASE_URL: "https://api.foodshare.club",
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    }, async () => {
      const deps = defaultPlaceCoverDependencies({} as never, "test");
      const result = await deps.crawl({
        name: "Parnell Community Fridge",
        post_type: "fridge",
        website: OWN_SITE,
        listingId: 7,
      });
      assertEquals(result.candidates.length, 1);
      assertEquals(stub.urls.filter((u) => u.endsWith("/inference/imageSearch")).length, 1);
    });
  } finally {
    stub.restore();
    restoreDns();
  }
});

Deno.test("production fetchBytes: http scheme is rejected before any fetch", async () => {
  // validateUrl (scheme check) runs inside resolveAndValidateUrl before any
  // DNS — hermetic.
  const stub = stubFetch((url) => {
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    const deps = defaultPlaceCoverDependencies({} as never, "test");
    await assertRejects(
      () => deps.fetchBytes("http://img.example/f.jpg"),
      ValidationError,
      "HTTP not allowed, use HTTPS",
    );
    assertEquals(stub.urls.length, 0);
  } finally {
    stub.restore();
  }
});

Deno.test("production fetchBytes: an empty resolution fails closed before any fetch", async () => {
  const restoreDns = stubDns(null);
  const stub = stubFetch((url) => {
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    const deps = defaultPlaceCoverDependencies({} as never, "test");
    await assertRejects(
      () => deps.fetchBytes(IMG_URL),
      ValidationError,
    );
    assertEquals(stub.urls.length, 0);
  } finally {
    stub.restore();
    restoreDns();
  }
});

Deno.test("production fetchBytes: a private resolution is rejected before download", async () => {
  const restoreDns = stubDns(PRIVATE_IP);
  const stub = stubFetch((url) => {
    throw new Error(`unexpected fetch: ${url}`);
  });
  try {
    const deps = defaultPlaceCoverDependencies({} as never, "test");
    await assertRejects(
      () => deps.fetchBytes(IMG_URL),
      ValidationError,
      `Resolved IP ${PRIVATE_IP} is private/internal`,
    );
    assertEquals(stub.urls.length, 0);
  } finally {
    stub.restore();
    restoreDns();
  }
});

Deno.test("api-v1-ai postBodySchema carries the imageVerify fields (no silent strip)", () => {
  const parsed = postBodySchema.safeParse({
    image_url: OWN_IMAGE,
    listing_name: "Parnell Community Fridge",
    listing_address: "1 Main St, Auckland",
    post_type: "fridge",
  });
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data?.image_url, OWN_IMAGE);
    assertEquals(parsed.data?.listing_name, "Parnell Community Fridge");
    assertEquals(parsed.data?.listing_address, "1 Main St, Auckland");
  }
});
