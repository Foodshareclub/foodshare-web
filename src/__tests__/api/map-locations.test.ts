import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * `/api/map/locations` is the map's marker endpoint.
 *
 * It was a Server Action (a POST), which meant every `moveend` spent one of the
 * 30/minute mutation-limiter budget in `src/proxy.ts` — a limiter with no path
 * filter, so it throttled reads. Panning for ~10s produced 429s and marker
 * loading stopped. It is public and unauthenticated, so the bounds parser is the
 * part that must be strict: a non-finite or inverted bound produces an unbounded
 * PostGIS envelope.
 */

const mockState = {
  locations: [] as Array<Record<string, unknown>>,
  error: null as Error | null,
  lastArgs: null as Array<unknown> | null,
};

mock.module("@/lib/data/maps", () => ({
  getNearbyLocations: mock((...args: unknown[]) => {
    mockState.lastArgs = args;
    if (mockState.error) return Promise.reject(mockState.error);
    return Promise.resolve(mockState.locations);
  }),
}));

import { GET } from "@/app/api/map/locations/route";

function req(query: string): Request {
  return new Request(`https://foodshare.club/api/map/locations?${query}`);
}

const VALID = "north=51.51&south=51.50&east=-0.09&west=-0.10";

describe("GET /api/map/locations", () => {
  beforeEach(() => {
    mockState.locations = [];
    mockState.error = null;
    mockState.lastArgs = null;
  });

  it("returns locations for valid bounds", async () => {
    mockState.locations = [{ id: 1, post_name: "Tomatoes" }];

    const res = await GET(req(VALID));
    const body = (await res.json()) as { locations: unknown[] };

    expect(res.status).toBe(200);
    expect(body.locations).toHaveLength(1);
  });

  it("is cacheable", async () => {
    const res = await GET(req(VALID));
    expect(res.headers.get("Cache-Control")).toContain("max-age");
  });

  describe("rejects unusable bounds", () => {
    const cases: Array<[string, string]> = [
      ["missing all", ""],
      ["missing one edge", "north=51.51&south=51.50&east=-0.09"],
      ["non-numeric", "north=abc&south=51.50&east=-0.09&west=-0.10"],
      ["NaN", "north=NaN&south=51.50&east=-0.09&west=-0.10"],
      ["Infinity", "north=Infinity&south=51.50&east=-0.09&west=-0.10"],
      ["empty value", "north=&south=51.50&east=-0.09&west=-0.10"],
      ["north below south", "north=51.40&south=51.50&east=-0.09&west=-0.10"],
      ["east below west", "north=51.51&south=51.50&east=-0.20&west=-0.10"],
      ["latitude out of range", "north=91&south=51.50&east=-0.09&west=-0.10"],
      ["longitude out of range", "north=51.51&south=51.50&east=181&west=-0.10"],
    ];

    for (const [label, query] of cases) {
      it(label, async () => {
        const res = await GET(req(query));

        expect(res.status).toBe(400);
        // Must not reach the data layer at all.
        expect(mockState.lastArgs).toBeNull();
      });
    }
  });

  it("maps a plural URL slug to the singular post_type", async () => {
    await GET(req(`${VALID}&type=things`));
    expect(mockState.lastArgs?.[1]).toBe("thing");

    await GET(req(`${VALID}&type=organisations`));
    expect(mockState.lastArgs?.[1]).toBe("business");

    await GET(req(`${VALID}&type=fridges`));
    expect(mockState.lastArgs?.[1]).toBe("fridge");
  });

  it("passes no type filter when none is given", async () => {
    await GET(req(VALID));
    expect(mockState.lastArgs?.[1]).toBeUndefined();
  });

  it("clamps the requested limit", async () => {
    await GET(req(`${VALID}&limit=99999999`));
    expect(mockState.lastArgs?.[2]).toBe(1000);

    mockState.lastArgs = null;
    await GET(req(`${VALID}&limit=250`));
    expect(mockState.lastArgs?.[2]).toBe(250);

    mockState.lastArgs = null;
    await GET(req(`${VALID}&limit=-5`));
    expect(mockState.lastArgs?.[2]).toBe(500);
  });

  it("returns 502 rather than an empty list when the data layer fails", async () => {
    mockState.error = new Error("PostgREST exploded");

    const res = await GET(req(VALID));

    // The client treats an error as "keep existing markers". An empty 200 would
    // blank the map on any transient failure — that was the old behaviour.
    expect(res.status).toBe(502);
    const body = (await res.json()) as { locations?: unknown };
    expect(body.locations).toBeUndefined();
  });
});
