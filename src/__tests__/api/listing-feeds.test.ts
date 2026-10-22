import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { NearbyPostsOptions } from "@/lib/data/nearby-posts";
import type { PaginationOptions } from "@/lib/data/products";

/**
 * The two listing-feed routes.
 *
 * Both were Server Actions, i.e. POSTs. `src/proxy.ts` applies a
 * 30/minute mutation limiter with no path filter, so every page of infinite
 * scroll — and every geolocation re-resolve — spent one of the calls a real
 * write needs. After a few pages the feed returned 429 and the client showed
 * "Something went wrong"; the user's next actual mutation was then rate
 * limited too, because the exhausted bucket is shared.
 *
 * These tests pin the properties that fix depends on: they are reads on a
 * GET, they validate the values that reach PostGIS, and a failure is a
 * distinguishable `success: false` rather than an empty page — the client
 * keeps what it already has, which an empty `data` array would destroy.
 */

const mockState = {
  nearby: { data: [] as unknown[], hasMore: false, nextCursor: null as unknown },
  page: { data: [] as unknown[], hasMore: false, nextCursor: null as number | null },
  nearbyError: null as Error | null,
  pageError: null as Error | null,
  nearbyArgs: null as NearbyPostsOptions | null,
  pageArgs: null as PaginationOptions | null,
};

mock.module("@/lib/data/nearby-posts", () => ({
  getNearbyPosts: mock((args: NearbyPostsOptions) => {
    mockState.nearbyArgs = args;
    if (mockState.nearbyError) return Promise.reject(mockState.nearbyError);
    return Promise.resolve(mockState.nearby);
  }),
}));

mock.module("@/lib/data/products", () => ({
  getProductsPaginated: mock((_type: string, options: PaginationOptions) => {
    mockState.pageArgs = options;
    if (mockState.pageError) return Promise.reject(mockState.pageError);
    // Echo the inputs so the test can assert what was threaded through.
    return Promise.resolve({ ...mockState.page, searchTerm: options.searchTerm ?? null });
  }),
}));

// The routes call the data layer, which is what writes the arguments. Reading
// them through a function keeps the checker from narrowing the property to the
// value it was last assigned: the reset before a call is exactly the case
// where that is not what the call found.
const nearbyArgs = (): NearbyPostsOptions | null => mockState.nearbyArgs;
const pageArgs = (): PaginationOptions | null => mockState.pageArgs;

import { GET as nearbyGET } from "@/app/api/listings/nearby/route";
import { GET as pageGET } from "@/app/api/listings/route";

function url(path: string, query: string): Request {
  return new Request(`https://foodshare.club${path}?${query}`);
}

describe("GET /api/listings/nearby", () => {
  beforeEach(() => {
    mockState.nearby = { data: [{ id: 1 }], hasMore: true, nextCursor: { distance: 120, id: 7 } };
    mockState.nearbyError = null;
    mockState.nearbyArgs = null;
  });

  it("is a read: a GET, not a Server Action POST", async () => {
    const response = await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, hasMore: true });
    expect(response.headers.get("allow")).toBeNull();
  });

  it("echoes the radius it actually used, so the client cannot disagree", async () => {
    const response = await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1&radius=500000"));
    const body = await response.json();

    // 500km asked for, 50km ceiling applied. The client needs the clamped
    // value to keep its own radius state honest.
    expect(body.radius).toBe(50000);
    expect(nearbyArgs()?.radiusMeters).toBe(50000);
  });

  it("clamps a radius below the floor", async () => {
    const response = await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1&radius=1"));
    expect((await response.json()).radius).toBe(100);
  });

  it("rejects coordinates that would make the PostGIS envelope unbounded", async () => {
    for (const query of ["lat=abc&lng=-0.1", "lat=91&lng=-0.1", "lat=51.5&lng=181", "lat=&lng=-0.1", "lng=-0.1"]) {
      const response = await nearbyGET(url("/api/listings/nearby", query));
      expect(response.status).toBe(400);
    }
    // And nothing reached the data layer.
    expect(mockState.nearbyArgs).toBeNull();
  });

  it("round-trips the keyset cursor", async () => {
    const first = await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1"));
    const cursor = (await first.json()).nextCursor;
    expect(typeof cursor).toBe("string");

    await nearbyGET(url("/api/listings/nearby", `lat=51.5&lng=-0.1&cursor=${cursor}`));
    expect(nearbyArgs()?.cursor).toEqual({ distance: 120, id: 7 });
  });

  it("ignores a hand-edited cursor instead of querying with it", async () => {
    // A negative distance is not reachable from the app. Passing it to the
    // keyset predicate would produce a query no row satisfies.
    const negative = Buffer.from(JSON.stringify({ d: -5, i: 3 }), "utf8").toString("base64url");
    await nearbyGET(url("/api/listings/nearby", `lat=51.5&lng=-0.1&cursor=${negative}`));
    expect(nearbyArgs()?.cursor).toBeNull();

    mockState.nearbyArgs = null;
    await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1&cursor=not-a-cursor"));
    expect(nearbyArgs()?.cursor).toBeNull();
  });

  it("reports a data-layer failure without emptying the page", async () => {
    mockState.nearbyError = new Error("PostgREST unavailable");
    const response = await nearbyGET(url("/api/listings/nearby", "lat=51.5&lng=-0.1"));

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ success: false });
  });
});

describe("GET /api/listings", () => {
  beforeEach(() => {
    mockState.page = { data: [{ id: 1 }], hasMore: true, nextCursor: 41 };
    mockState.pageError = null;
    mockState.pageArgs = null;
  });

  it("threads the search term through to the data layer", async () => {
    const response = await pageGET(url("/api/listings", "type=food&q=apples&cursor=40"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, hasMore: true, nextCursor: 41, searchTerm: "apples" });
  });

  it("ignores a cursor that is not a positive integer", async () => {
    // `Number("abc")` is NaN, and a NaN `.lt()` filter looks like a valid
    // request while matching nothing — the client would show an empty page
    // rather than page one. Same for a fractional or non-positive id: the
    // keyset predicate needs a serial.
    for (const cursor of ["abc", "-5", "0", "1.5", "NaN", "Infinity", "null", "1%202"]) {
      mockState.pageArgs = null;
      const response = await pageGET(url("/api/listings", `cursor=${cursor}`));

      expect(response.status).toBe(200);
      expect(pageArgs()?.cursor).toBeNull();
    }
  });

  it("accepts any spelling that is a positive integer", async () => {
    for (const [raw, expected] of [
      ["40", 40],
      [" 40 ", 40],
      ["1e3", 1000],
    ] as const) {
      mockState.pageArgs = null;
      await pageGET(url("/api/listings", `cursor=${encodeURIComponent(raw)}`));
      expect(pageArgs()?.cursor).toBe(expected);
    }
  });

  it("reports a data-layer failure as a failure, not as an empty feed", async () => {
    mockState.pageError = new Error("PostgREST unavailable");
    const response = await pageGET(url("/api/listings", "type=food"));

    expect(response.status).toBe(502);
    const body = await response.json();
    // `data` is absent rather than `[]`: the client appends to what it has,
    // and an empty array would be indistinguishable from "no more listings".
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });
});
