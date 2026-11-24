import { describe, expect, it, mock } from "bun:test";
import {
  DB_DEFAULT_KM,
  DB_DEFAULT_KM_METERS,
  DB_DEFAULT_MILES,
  DB_DEFAULT_MILES_METERS,
  getDefaultSearchDistance,
  isMilesRegion,
} from "@/lib/location/default-distance";

describe("default-distance library (Database-Driven Architecture)", () => {
  describe("isMilesRegion", () => {
    it("identifies US and UK as miles regions", () => {
      expect(isMilesRegion("US")).toBe(true);
      expect(isMilesRegion("us")).toBe(true);
      expect(isMilesRegion("GB")).toBe(true);
      expect(isMilesRegion("gb")).toBe(true);
      expect(isMilesRegion("MM")).toBe(true);
      expect(isMilesRegion("LR")).toBe(true);
    });

    it("identifies metric countries as non-miles", () => {
      expect(isMilesRegion("DE")).toBe(false);
      expect(isMilesRegion("FR")).toBe(false);
      expect(isMilesRegion("CA")).toBe(false);
      expect(isMilesRegion("AU")).toBe(false);
      expect(isMilesRegion(null)).toBe(false);
      expect(isMilesRegion(undefined)).toBe(false);
    });

    it("respects explicit unit parameter overrides", () => {
      expect(isMilesRegion("DE", "miles")).toBe(true);
      expect(isMilesRegion("US", "km")).toBe(false);
    });
  });

  describe("getDefaultSearchDistance", () => {
    it("returns 40 miles (64,374m) for US location", async () => {
      const result = await getDefaultSearchDistance("US");
      expect(result.unit).toBe("miles");
      expect(result.distance).toBe(DB_DEFAULT_MILES);
      expect(result.radiusMeters).toBe(DB_DEFAULT_MILES_METERS);
      expect(result.radiusKm).toBeCloseTo(64.374, 2);
    });

    it("returns 40 km (40,000m) for Germany / metric location", async () => {
      const result = await getDefaultSearchDistance("DE");
      expect(result.unit).toBe("km");
      expect(result.distance).toBe(DB_DEFAULT_KM);
      expect(result.radiusMeters).toBe(DB_DEFAULT_KM_METERS);
      expect(result.radiusKm).toBe(40);
    });

    it("returns 40 km (40,000m) when country is undefined", async () => {
      const result = await getDefaultSearchDistance(undefined);
      expect(result.unit).toBe("km");
      expect(result.distance).toBe(40);
      expect(result.radiusMeters).toBe(40000);
    });

    it("returns 40 miles when unit='miles' regardless of country", async () => {
      const result = await getDefaultSearchDistance("DE", "miles");
      expect(result.unit).toBe("miles");
      expect(result.distance).toBe(40);
      expect(result.radiusMeters).toBe(64374);
    });
  });
});
