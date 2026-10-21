import { describe, expect, it } from "bun:test";

import { buildAggregateRating } from "@/lib/jsonld";
import { coarseAreaLabel, parsePostGISPoint } from "@/utils/postgis";

/**
 * These two functions are the difference between a public profile that
 * prints `[object Object]` and one that prints an approximate area, and
 * between a Product JSON-LD with no `aggregateRating` and one with a
 * truthful one. Both bugs shipped silently, so both are pinned here.
 */

describe("coarseAreaLabel", () => {
  it("quantises to a cell, not a pin", () => {
    // 51.5074 N, 0.1278 W — Charing Cross. Truncating to 1 dp gives an
    // ~11 km cell, which is the granularity someone would agree to publish.
    expect(coarseAreaLabel({ latitude: 51.5074, longitude: -0.1278 })).toBe("51.5, -0.1");
  });

  it("splits a cell at its edge, not at its midpoint", () => {
    // The reason this truncates instead of rounding: rounding puts the cell
    // boundary at the .05 mark, so 0.14 and 0.16 — 200 m apart, and both
    // unambiguously inside the same neighbourhood — reported as different
    // areas. Truncation keeps a point inside its own cell.
    expect(coarseAreaLabel({ latitude: 51.51, longitude: 0.14 })).toBe("51.5, 0.1");
    expect(coarseAreaLabel({ latitude: 51.52, longitude: 0.16 })).toBe("51.5, 0.1");
    // The next cell over is a different area, as it should be.
    expect(coarseAreaLabel({ latitude: 51.52, longitude: 0.24 })).toBe("51.5, 0.2");
  });

  it("distinguishes cells that really are different areas", () => {
    const north = coarseAreaLabel({ latitude: 51.5, longitude: 0.1 });
    const south = coarseAreaLabel({ latitude: 41.4, longitude: 2.2 });
    expect(north).not.toBe(south);
  });

  it("handles negative coordinates without collapsing the sign", () => {
    expect(coarseAreaLabel({ latitude: -33.8688, longitude: 151.2093 })).toBe("-33.8, 151.2");
  });

  it("refuses null, NaN and Infinity", () => {
    expect(coarseAreaLabel(null)).toBeNull();
    expect(coarseAreaLabel({ latitude: Number.NaN, longitude: 0 })).toBeNull();
    expect(coarseAreaLabel({ latitude: 0, longitude: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("refuses the poles, where a longitude cell is degenerate", () => {
    expect(coarseAreaLabel({ latitude: 90, longitude: 0 })).toBeNull();
    expect(coarseAreaLabel({ latitude: -89.9, longitude: 10 })).toBeNull();
  });
});

describe("coarseAreaLabel via the raw column", () => {
  it("renders a point that PostgREST returns as GeoJSON", () => {
    // The regression: the profile page did `String(profile.location)`, which
    // for this value is the literal text "[object Object]".
    const location = { type: "Point", coordinates: [14.4378, 50.0755] };
    expect(String(location)).toBe("[object Object]");
    expect(coarseAreaLabel(parsePostGISPoint(location))).toBe("50.0, 14.4");
  });

  it("renders a point that arrives as WKT", () => {
    expect(coarseAreaLabel(parsePostGISPoint("POINT(14.4378 50.0755)"))).toBe("50.0, 14.4");
  });

  it("returns null for a WKB hex value it cannot parse", () => {
    expect(coarseAreaLabel(parsePostGISPoint("0101000020E6100000"))).toBeNull();
  });

  it("returns null for null", () => {
    expect(coarseAreaLabel(parsePostGISPoint(null))).toBeNull();
  });
});

describe("buildAggregateRating", () => {
  it("uses the mean of every review, not just the top two scores", () => {
    // The old helper averaged the 4- and 5-star counts only, which reported
    // 4.6 for nine 1-star reviews and two 5-star ones. Google treats a rating
    // that excludes the bad reviews as a manual-action risk.
    const result = buildAggregateRating(3, 11);
    expect(result).toEqual({ ratingValue: 3, reviewCount: 11 });
  });

  it("returns null when nothing is rated", () => {
    expect(buildAggregateRating(null, 0)).toBeNull();
    expect(buildAggregateRating(null, null)).toBeNull();
  });

  it("returns null for a single review, which is not an aggregate", () => {
    expect(buildAggregateRating(5, 1)).toBeNull();
  });

  it("clamps a mean above the scale, and rejects one below it", () => {
    // Above 5 is a rounding artefact in the aggregate; clamp so the emitted
    // value stays inside the schema's range. Below 1 is not a rounding
    // artefact — a mean under 1 means the query returned something that is
    // not a rating — so it is rejected rather than clamped to a lie.
    expect(buildAggregateRating(9, 10)?.ratingValue).toBe(5);
    expect(buildAggregateRating(-3, 10)).toBeNull();
    expect(buildAggregateRating(0, 10)).toBeNull();
  });

  it("rounds to one decimal so the JSON-LD is stable", () => {
    expect(buildAggregateRating(4.27, 7)?.ratingValue).toBe(4.3);
  });

  it("rejects a non-finite mean", () => {
    expect(buildAggregateRating(Number.NaN, 5)).toBeNull();
  });
});
