import { describe, expect, it, mock } from "bun:test";

/**
 * What the bridges do when the module cannot be reached.
 *
 * The modules are the fast path, and the bridges fall back to JavaScript
 * when one of them fails. The fallback is the path nobody sees until the
 * module is broken, and a fallback that answered differently — or not at
 * all — would be worse than the failure it was covering up.
 *
 * The modules are mocked to fail here, so the fallback is the path that
 * runs. The answers are the ones the modules give, measured in the
 * bridge tests.
 */

const UNAVAILABLE = () => {
  throw new Error("the module is not available");
};

/** The failures the bridges record, so the log is not the test's output. */
const logged: Array<{ message: string; error?: Error }> = [];

mock.module("@/lib/logger", () => ({
  createLogger: () => ({
    error: (message: string, error?: Error) => {
      logged.push({ message, error });
    },
    warn: () => {},
    info: () => {},
    debug: () => {},
  }),
  logger: {
    error: (message: string, error?: Error) => {
      logged.push({ message, error });
    },
    warn: () => {},
    info: () => {},
    debug: () => {},
  },
}));

mock.module("@/wasm/foodshare-geo/foodshare_geo", () => ({
  distance: UNAVAILABLE,
  calculate_product_distances: UNAVAILABLE,
  filter_within_radius: UNAVAILABLE,
  parse_location: UNAVAILABLE,
}));

mock.module("@/wasm/foodshare-search/foodshare_search", () => ({
  vector_cosine_similarity: UNAVAILABLE,
  vector_l2_distance: UNAVAILABLE,
  vector_normalize_dimensions: UNAVAILABLE,
  rrf_merge: UNAVAILABLE,
  relevance_score: UNAVAILABLE,
  hybrid_score: UNAVAILABLE,
  distance_decay: UNAVAILABLE,
  edit_distance: UNAVAILABLE,
}));

const { calculateItemDistances, filterItemsWithinRadius, parsePostGisLocation } = await import("@/lib/wasm-geo");
const { fuseRankedLists } = await import("@/lib/wasm-search");

/** The points the bridge tests measure. */
const ITEMS = [
  { id: "berlin", location: { coordinates: [13.405, 52.52] } },
  { id: "paris", location: { coordinates: [2.3522, 48.8566] } },
  { id: "london", location: "POINT(-0.1276 51.5074)" },
  { id: "nowhere", location: null },
];

/** Frankfurt. */
const LAT = 50.1109;
const LNG = 8.6821;

describe("the geo bridge without its module", () => {
  it("measures the distance the module would have measured", () => {
    const measured = calculateItemDistances(LAT, LNG, ITEMS);

    // The same answers the module gives: Frankfurt to Berlin is 424 km,
    // to Paris 478 km, to London 638 km.
    expect(measured[0].distance).toBeCloseTo(423.528, 2);
    expect(measured[1].distance).toBeCloseTo(477.892, 2);
    expect(measured[2].distance).toBeCloseTo(637.753, 2);
  });

  it("has no distance for a location that cannot be read", () => {
    const measured = calculateItemDistances(LAT, LNG, ITEMS);

    expect(measured[3].distance).toBe(Number.POSITIVE_INFINITY);
  });

  it("keeps every field the caller passed in", () => {
    const measured = calculateItemDistances(LAT, LNG, [
      { id: "berlin", title: "Pantry on Main St", location: { coordinates: [13.405, 52.52] } },
    ]);

    expect(measured[0].title).toBe("Pantry on Main St");
    expect(measured[0].distance).toBeCloseTo(423.528, 2);
  });

  it("filters by radius the way the module filters", () => {
    const filtered = filterItemsWithinRadius(LAT, LNG, ITEMS, 500);

    expect(filtered.map((item) => item.id)).toEqual(["berlin", "paris"]);
    expect(filtered[0].distance).toBeCloseTo(423.528, 2);
  });

  it("reads a location the way the module reads it", () => {
    expect(parsePostGisLocation({ coordinates: [13.405, 52.52] })).toEqual({
      latitude: 52.52,
      longitude: 13.405,
    });
    expect(parsePostGisLocation("POINT(13.405 52.52)")).toEqual({
      latitude: 52.52,
      longitude: 13.405,
    });
    expect(parsePostGisLocation("SRID=4326;POINT(13.405 52.52)")).toEqual({
      latitude: 52.52,
      longitude: 13.405,
    });
    expect(parsePostGisLocation({ latitude: 52.52, longitude: 13.405 })).toEqual({
      latitude: 52.52,
      longitude: 13.405,
    });
    expect(parsePostGisLocation(null)).toBeNull();
  });
});

describe("the search bridge without its module", () => {
  it("fuses the lists the way the module fuses them", () => {
    const fused = fuseRankedLists([
      ["item1", "item2", "item3"],
      ["item2", "item1", "item4"],
    ]);

    // The same order and the same scores the module gives.
    expect(fused.map((item) => item.id)).toEqual(["item1", "item2", "item3", "item4"]);
    expect(fused[0].score).toBeCloseTo(0.0325224, 6);
    expect(fused[2].score).toBeCloseTo(0.015873, 6);
  });

  it("does not answer with nothing", () => {
    // The module used to be answered with an empty list when it failed,
    // which read as a search that found nothing.
    const fused = fuseRankedLists([
      ["a", "b"],
      ["b", "c"],
    ]);

    expect(fused).toHaveLength(3);
  });

  it("keeps a numeric identifier distinct from the same digits as a string", () => {
    const fused = fuseRankedLists([[1], ["1"]]);

    expect(fused.map((item) => item.id).sort()).toEqual([1, "1"]);
  });

  it("records the failure that made it fall back", () => {
    logged.length = 0;

    fuseRankedLists([["a", "b"]]);

    expect(logged).toHaveLength(1);
    expect(logged[0].error?.message).toContain("the module is not available");
  });
});
