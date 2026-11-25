import { MAX_NEARBY_RADIUS_METERS, fetchNearbyWithExpansion, nextRadiusStep } from "@/lib/location/nearby-expansion";
import { describe, expect, it } from "bun:test";

describe("nearby radius expansion", () => {
  it("doubles the radius and caps it", () => {
    expect(nextRadiusStep(40000)).toBe(80000);
    expect(nextRadiusStep(100000)).toBe(MAX_NEARBY_RADIUS_METERS);
  });

  it("returns the first non-empty page without widening further", async () => {
    const radii: number[] = [];
    const { page, radius } = await fetchNearbyWithExpansion(async (r) => {
      radii.push(r);
      return { data: r >= 80000 ? [1] : [] };
    }, 40000);
    expect(radii).toEqual([40000, 80000]);
    expect(radius).toBe(80000);
    expect(page.data).toEqual([1]);
  });

  it("stops at the cap and returns the empty page", async () => {
    const radii: number[] = [];
    const { page, radius } = await fetchNearbyWithExpansion(async (r) => {
      radii.push(r);
      return { data: [] as number[] };
    }, 40000);
    expect(radii).toEqual([40000, 80000, 160000]);
    expect(radius).toBe(MAX_NEARBY_RADIUS_METERS);
    expect(page.data).toEqual([]);
  });
});
