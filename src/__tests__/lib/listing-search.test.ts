import { describe, expect, test } from "bun:test";
import {
  buildListingSearchUrl,
  parseSearchLocation,
  parseSearchRadius,
} from "@/lib/listing-search";

describe("listing search navigation", () => {
  test("all categories uses the existing food route and preserves a literal keyword", () => {
    const url = new URL(
      buildListingSearchUrl({ category: "all", term: "  Banana & bread  ", radius: null }),
      "https://example.test"
    );
    expect(url.pathname).toBe("/food");
    expect(url.searchParams.get("type")).toBe("all");
    expect(url.searchParams.get("key_word")).toBe("Banana & bread");
    expect(url.searchParams.get("distance")).toBe("any");
  });

  test("combines keyword, category and an explicit radius in a reloadable URL", () => {
    const url = new URL(
      buildListingSearchUrl({
        category: "food",
        term: "Banana",
        radius: 2000,
        location: { lat: 0, lng: -122.4 },
      }),
      "https://example.test"
    );
    expect(parseSearchLocation(url.searchParams)).toEqual({ lat: 0, lng: -122.4 });
    expect(url.searchParams.get("radius")).toBe("2000");
    expect(url.searchParams.get("key_word")).toBe("Banana");
    expect(url.searchParams.get("distance")).toBe("nearby");
  });

  test("clearing distance removes coordinates and opting out survives reloads", () => {
    const url = new URL(
      buildListingSearchUrl({
        category: "food",
        term: "",
        radius: null,
        location: { lat: 1, lng: 2 },
      }),
      "https://example.test"
    );
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("key_word")).toBe(false);
    expect(url.searchParams.get("distance")).toBe("any");
  });

  test("challenges have text search without a geographic filter", () => {
    expect(
      buildListingSearchUrl({
        category: "challenge",
        term: "Waste",
        radius: 1000,
        location: { lat: 1, lng: 2 },
      })
    ).toBe("/challenge?key_word=Waste");
    expect(buildListingSearchUrl({ category: "business", term: "", radius: null })).toBe(
      "/organisation?distance=any"
    );
  });

  test("rejects malformed coordinates and clamps finite distances", () => {
    for (const value of [
      "lat=1x&lng=2",
      "lat=Infinity&lng=2",
      "lat=91&lng=2",
      "lat=&lng=2",
      "lat=1&lng=181",
    ]) {
      expect(parseSearchLocation(new URLSearchParams(value))).toBeNull();
    }
    expect(parseSearchRadius("invalid")).toBe(5000);
    expect(parseSearchRadius("Infinity")).toBe(5000);
    expect(parseSearchRadius("0")).toBe(100);
    expect(parseSearchRadius("90000")).toBe(50000);
  });
});
