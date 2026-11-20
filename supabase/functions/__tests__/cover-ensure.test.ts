/**
 * Cover ensure tests — tier ladder, service auth, operated-listing
 * authorization, deterministic title card, and loud-failure semantics.
 */

import { assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import {
  AuthorizationError,
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  ValidationError,
} from "../_shared/errors.ts";
import {
  buildGenerationPrompt,
  type CoverEnsureDependencies,
  ensureCoverLadder,
  handleCoverEnsure,
} from "../api-v1-images/lib/cover-ensure.ts";
import { renderTitleCard } from "../api-v1-images/lib/cover-title-card.ts";
import { rasterType } from "../api-v1-products/lib/listing-cover.ts";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SERVICE_KEY = "test-service-role-key";
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

const input = {
  title: "Organic apples",
  description: "Fresh apples from the garden",
  postType: "food",
  images: [] as string[],
};

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

interface StoreCall {
  path: string;
  bytes: Uint8Array;
  contentType: string;
}

function ladderDeps(overrides: Partial<CoverEnsureDependencies> = {}) {
  const stored = new Map<string, Uint8Array>();
  const calls = { store: [] as StoreCall[], remove: [] as string[], generate: 0, render: 0 };
  const deps: CoverEnsureDependencies = {
    isAlive: () => Promise.resolve(false),
    generate: () => {
      calls.generate++;
      return Promise.reject(new Error("generation unavailable"));
    },
    render: (title, description) => {
      calls.render++;
      return renderTitleCard(title, description);
    },
    store: (path, bytes, contentType) => {
      calls.store.push({ path, bytes, contentType });
      const url = `https://api.foodshare.club/storage/v1/object/public/posts/${path}`;
      stored.set(url, bytes);
      return Promise.resolve(url);
    },
    verify: (url) => {
      const bytes = stored.get(url);
      if (!bytes) return Promise.reject(new Error("readback 404"));
      return Promise.resolve(bytes);
    },
    remove: (path) => {
      calls.remove.push(path);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { deps, calls, stored };
}

// ---------------------------------------------------------------------------
// Tier 3 — deterministic local title card
// ---------------------------------------------------------------------------

Deno.test("title card: same title and description render byte-identical PNGs", async () => {
  const a = renderTitleCard("Organic apples", "Fresh from the garden");
  const b = renderTitleCard("Organic apples", "Fresh from the garden");
  assertEquals(a, b);
  assertEquals(await sha256(a), await sha256(b));
  assertEquals(rasterType(a), "png");
  assertEquals(a.length <= 5 * 1024 * 1024, true);
});

Deno.test("title card: different text produces a different card", async () => {
  const a = renderTitleCard("Organic apples", "Fresh from the garden");
  const b = renderTitleCard("Organic apples", "A different description");
  assertEquals(await sha256(a) === await sha256(b), false);
});

Deno.test("title card: empty and unsupported input still renders a valid card", () => {
  const empty = renderTitleCard("", "");
  assertEquals(rasterType(empty), "png");
  const unicode = renderTitleCard("有机苹果 🍎", "описание");
  assertEquals(rasterType(unicode), "png");
});

// ---------------------------------------------------------------------------
// Tier ladder
// ---------------------------------------------------------------------------

Deno.test("ladder: 0-image payload lands on the title-card floor with a stored URL", async () => {
  const { deps, calls } = ladderDeps();
  const result = await ensureCoverLadder(input, OWNER, deps);
  assertEquals(result.tier, 3);
  assertEquals(result.images, [result.url]);
  assertEquals(
    result.url.startsWith(
      `https://api.foodshare.club/storage/v1/object/public/posts/${OWNER}/cover-ensure/`,
    ),
    true,
  );
  assertEquals(result.url.endsWith(".png"), true);
  assertEquals(calls.store.length, 1);
  assertEquals(calls.store[0].contentType, "image/png");
  assertEquals(result.provenance?.kind, "title-card");
});

Deno.test("ladder: generation success is tier 2 and stores validated bytes", async () => {
  const { deps, calls } = ladderDeps({ generate: () => Promise.resolve(pngBytes) });
  const result = await ensureCoverLadder(input, OWNER, deps);
  assertEquals(result.tier, 2);
  assertEquals(calls.render, 0);
  assertEquals(calls.store[0].bytes, pngBytes);
  assertEquals(result.provenance?.kind, "generated");
});

Deno.test("ladder: all-dead payload is replaced by one stored cover", async () => {
  const { deps } = ladderDeps();
  const dead = {
    ...input,
    images: ["https://dead.example/a.jpg", "https://dead.example/b.jpg"],
  };
  const result = await ensureCoverLadder(dead, OWNER, deps);
  assertEquals(result.tier, 3);
  assertEquals(result.images.length, 1);
  assertEquals(result.images[0], result.url);
});

Deno.test("ladder: any live URL keeps the existing images untouched", async () => {
  const unexpected = () => {
    throw new Error("Live covers must not trigger generation, render or storage");
  };
  const { deps } = ladderDeps({
    isAlive: (url) => Promise.resolve(url.endsWith("live.jpg")),
    generate: unexpected,
    render: unexpected,
    store: unexpected,
  });
  const images = [
    "https://api.foodshare.club/storage/v1/object/public/posts/u/dead.jpg",
    "https://api.foodshare.club/storage/v1/object/public/posts/u/live.jpg",
  ];
  const result = await ensureCoverLadder({ ...input, images }, OWNER, deps);
  assertEquals(result.tier, 0);
  assertEquals(result.images, images);
  assertEquals(result.url, images[0]);
});

Deno.test("ladder: generation error pages are rejected and the floor carries", async () => {
  const html = new TextEncoder().encode("<html><body>502 Bad Gateway</body></html>");
  const { deps, calls } = ladderDeps({ generate: () => Promise.resolve(html) });
  const result = await ensureCoverLadder(input, OWNER, deps);
  assertEquals(result.tier, 3);
  assertEquals(calls.render, 1);
});

Deno.test("ladder: a broken title card fails loudly and stores nothing", async () => {
  const { deps, calls } = ladderDeps({
    render: () => {
      throw new ServerError("renderer exploded");
    },
  });
  await assertRejects(() => ensureCoverLadder(input, OWNER, deps), ServerError);
  assertEquals(calls.store.length, 0);
});

Deno.test("ladder: readback hash mismatch is a loud failure", async () => {
  const { deps } = ladderDeps({
    verify: () => Promise.resolve(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
  });
  await assertRejects(() => ensureCoverLadder(input, OWNER, deps), ServerError);
});

// ---------------------------------------------------------------------------
// Generation prompt bounding
// ---------------------------------------------------------------------------

Deno.test("generation prompt is bounded, JSON-delimited and contact-stripped", () => {
  const prompt = buildGenerationPrompt({
    title: "A".repeat(5000) + " call 0412 345 678",
    description: "B".repeat(5000) + " email someone@example.com",
    postType: "food",
    images: [],
  });
  assertEquals(prompt.length < 3000, true);
  assertEquals(prompt.includes('"title"'), true);
  assertEquals(prompt.includes("someone@example.com"), false);
  assertEquals(prompt.includes("0412 345 678"), false);
  assertEquals(prompt.includes("A".repeat(1300)), false);
});

// ---------------------------------------------------------------------------
// Route handler — auth, authorization, persistence semantics
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
}

function mockContext(options: {
  headers?: Record<string, string>;
  body?: unknown;
  listing?: ListingRow | null;
  loadError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const updates: unknown[] = [];
  const listing = options.listing === undefined
    ? {
      id: 7,
      profile_id: OWNER,
      post_name: "Organic apples",
      post_description: "Fresh apples from the garden",
      post_type: "food",
      images: [],
    }
    : options.listing;
  const supabase = {
    from: (table: string) => {
      if (table !== "posts") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: listing, error: options.loadError ?? null }),
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
    request: new Request("https://api.foodshare.club/functions/v1/api-v1-images/cover/ensure", {
      method: "POST",
      headers: options.headers ?? {},
    }),
    body: options.body === undefined ? { listingId: 7, userId: OWNER } : options.body,
    userId: null,
    supabase,
    ctx: { requestId: "test-request" },
    corsHeaders: {},
  } as unknown as HandlerContext;
  return { ctx, updates };
}

Deno.test("cover ensure: anon and user-JWT callers are rejected before any data access", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const anon = mockContext({});
    await assertRejects(() => handleCoverEnsure(anon.ctx, ladderDeps().deps), ForbiddenError);
    const user = mockContext({ headers: { authorization: "Bearer user-jwt-token" } });
    await assertRejects(() => handleCoverEnsure(user.ctx, ladderDeps().deps), ForbiddenError);
    assertEquals(anon.updates.length, 0);
    assertEquals(user.updates.length, 0);
  });
});

Deno.test("cover ensure: service credential is accepted", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { ctx } = mockContext({ headers: { authorization: `Bearer ${SERVICE_KEY}` } });
    const response = await handleCoverEnsure(ctx, ladderDeps().deps);
    assertEquals(response.status, 200);
  });
});

Deno.test("cover ensure: a service caller cannot operate another user's listing", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { ctx, updates } = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      body: { listingId: 7, userId: OTHER },
    });
    await assertRejects(() => handleCoverEnsure(ctx, ladderDeps().deps), AuthorizationError);
    assertEquals(updates.length, 0);
  });
});

Deno.test("cover ensure: missing listing is 404 and invalid body is 400", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const missing = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      listing: null,
    });
    await assertRejects(() => handleCoverEnsure(missing.ctx, ladderDeps().deps), NotFoundError);
    const invalid = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      body: { listingId: "seven" },
    });
    await assertRejects(() => handleCoverEnsure(invalid.ctx, ladderDeps().deps), ValidationError);
  });
});

Deno.test("cover ensure: 0-image listing persists a live images[0] at tier 3 minimum", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps } = ladderDeps();
    const { ctx, updates } = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
    });
    const response = await handleCoverEnsure(ctx, deps);
    assertEquals(response.status, 200);
    const payload = await response.json();
    assertEquals(payload.success, true);
    assertEquals(payload.data.tier >= 2, true);
    assertEquals(payload.data.changed, true);
    assertEquals(payload.data.images.length, 1);
    assertEquals(payload.data.images[0], payload.data.url);
    assertEquals(updates.length, 1);
    assertEquals(updates[0], { images: [payload.data.url] });
  });
});

Deno.test("cover ensure: all-dead listing images are replaced", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps } = ladderDeps();
    const { ctx, updates } = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Organic apples",
        post_description: "Fresh apples",
        post_type: "food",
        images: ["https://dead.example/a.jpg"],
      },
    });
    const response = await handleCoverEnsure(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.changed, true);
    assertEquals(payload.data.images, [payload.data.url]);
    assertEquals(updates[0], { images: [payload.data.url] });
  });
});

Deno.test("cover ensure: failed persistence removes the stored object and keeps old images", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const { deps, calls } = ladderDeps();
    const { ctx, updates } = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      updateError: { message: "connection lost" },
    });
    await assertRejects(() => handleCoverEnsure(ctx, deps), DatabaseError);
    assertEquals(updates.length, 1); // the single atomic attempt failed
    assertEquals(calls.remove.length, 1); // stored object cleaned up
    assertEquals(calls.remove[0].startsWith(`${OWNER}/cover-ensure/`), true);
  });
});

Deno.test("cover ensure: live listing images are a no-op without writes", async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, CRON_SECRET: undefined }, async () => {
    const live = "https://api.foodshare.club/storage/v1/object/public/posts/u/live.jpg";
    const { deps } = ladderDeps({ isAlive: () => Promise.resolve(true) });
    const { ctx, updates } = mockContext({
      headers: { authorization: `Bearer ${SERVICE_KEY}` },
      listing: {
        id: 7,
        profile_id: OWNER,
        post_name: "Organic apples",
        post_description: "Fresh apples",
        post_type: "food",
        images: [live],
      },
    });
    const response = await handleCoverEnsure(ctx, deps);
    const payload = await response.json();
    assertEquals(payload.data.tier, 0);
    assertEquals(payload.data.changed, false);
    assertEquals(payload.data.url, live);
    assertEquals(updates.length, 0);
  });
});
