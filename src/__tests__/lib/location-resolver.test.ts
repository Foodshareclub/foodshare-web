import { describe, expect, it } from "bun:test";
import {
  type ApproximateLocation,
  isLegacyHardcodedCoordinates,
  isStaleFallbackLocation,
  isValidCoordinates,
  parseLocationCookie,
  resolveApproximateLocationFromHeaders,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";

describe("approximate-location library (Zero-Hardcoding)", () => {
  describe("isValidCoordinates", () => {
    it("validates proper coordinate bounds", () => {
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(38.5816, -121.4944)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);

      expect(isValidCoordinates(90.1, 0)).toBe(false);
      expect(isValidCoordinates(-90.1, 0)).toBe(false);
      expect(isValidCoordinates(0, 180.1)).toBe(false);
      expect(isValidCoordinates(0, -180.1)).toBe(false);
      expect(isValidCoordinates(Number.NaN, 0)).toBe(false);
      expect(isValidCoordinates(0, Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe("isLegacyHardcodedCoordinates", () => {
    it("detects legacy 52.52, 13.405 coordinates", () => {
      expect(isLegacyHardcodedCoordinates(52.52, 13.405)).toBe(true);
      expect(isLegacyHardcodedCoordinates(52.52, 13.405)).toBe(true);
      expect(isLegacyHardcodedCoordinates(38.5816, -121.4944)).toBe(false);
      expect(isLegacyHardcodedCoordinates(null, null)).toBe(false);
      expect(isLegacyHardcodedCoordinates(undefined, undefined)).toBe(false);
    });
  });

  describe("isStaleFallbackLocation", () => {
    it("identifies legacy Berlin fallback as stale unconditionally", () => {
      const staleBerlin: ApproximateLocation = {
        latitude: 52.52,
        longitude: 13.405,
        city: "Berlin",
        country: "DE",
        source: "ip",
        approximate: true,
      };

      expect(isStaleFallbackLocation(staleBerlin)).toBe(true);
    });

    it("does not flag real locations as stale", () => {
      const sacramentoLoc: ApproximateLocation = {
        latitude: 38.581571,
        longitude: -121.494428,
        city: "Sacramento",
        country: "US",
        source: "ip",
        approximate: true,
      };

      expect(isStaleFallbackLocation(sacramentoLoc)).toBe(false);
    });

    it("handles null and undefined safely", () => {
      expect(isStaleFallbackLocation(null)).toBe(false);
      expect(isStaleFallbackLocation(undefined)).toBe(false);
    });
  });

  describe("resolveApproximateLocationFromHeaders", () => {
    it("extracts coordinates and city from Cloudflare edge headers", () => {
      const headers = new Map([
        ["cf-iplatitude", "38.5816"],
        ["cf-iplongitude", "-121.4944"],
        ["cf-ipcity", "Sacramento"],
        ["cf-ipcountry", "US"],
      ]);

      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).not.toBeNull();
      expect(loc?.latitude).toBeCloseTo(38.5816, 4);
      expect(loc?.longitude).toBeCloseTo(-121.4944, 4);
      expect(loc?.city).toBe("Sacramento");
      expect(loc?.country).toBe("US");
      expect(loc?.source).toBe("ip");
      expect(loc?.approximate).toBe(true);
    });

    it("extracts coordinates and city from Vercel edge headers", () => {
      const headers = new Map([
        ["x-vercel-ip-latitude", "38.5816"],
        ["x-vercel-ip-longitude", "-121.4944"],
        ["x-vercel-ip-city", "Sacramento"],
        ["x-vercel-ip-country", "US"],
      ]);

      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).not.toBeNull();
      expect(loc?.latitude).toBeCloseTo(38.5816, 4);
      expect(loc?.longitude).toBeCloseTo(-121.4944, 4);
      expect(loc?.city).toBe("Sacramento");
      expect(loc?.country).toBe("US");
    });

    it("returns null when edge headers are absent (no hardcoded fallback guessing)", () => {
      const headers = new Map<string, string>();
      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).toBeNull();
    });

    it("returns null when coordinates in headers are out of bounds", () => {
      const headers = new Map([
        ["cf-iplatitude", "999.0"],
        ["cf-iplongitude", "999.0"],
      ]);

      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).toBeNull();
    });
  });

  describe("serializeLocationCookie & parseLocationCookie", () => {
    it("round-trips location data accurately through cookie string", () => {
      const loc: ApproximateLocation = {
        latitude: 38.5816,
        longitude: -121.4944,
        city: "Sacramento",
        country: "US",
        source: "ip",
        approximate: true,
      };

      const serialized = serializeLocationCookie(loc);
      expect(typeof serialized).toBe("string");

      const parsed = parseLocationCookie(serialized);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(38.5816, 4);
      expect(parsed?.longitude).toBeCloseTo(-121.4944, 4);
      expect(parsed?.city).toBe("Sacramento");
      expect(parsed?.country).toBe("US");
      expect(parsed?.source).toBe("ip");
      expect(parsed?.approximate).toBe(true);
    });

    it("automatically rejects legacy 52.52, 13.405 cookie values", () => {
      const legacyBerlinCookie = encodeURIComponent(
        JSON.stringify({
          lat: 52.52,
          lng: 13.405,
          city: "Berlin",
          country: "DE",
          source: "ip",
          approximate: true,
        }),
      );

      const parsed = parseLocationCookie(legacyBerlinCookie);
      expect(parsed).toBeNull();
    });

    it("handles invalid or corrupted cookie strings gracefully", () => {
      expect(parseLocationCookie(null)).toBeNull();
      expect(parseLocationCookie("")).toBeNull();
      expect(parseLocationCookie("not-a-json")).toBeNull();
      expect(parseLocationCookie(encodeURIComponent(JSON.stringify({ lat: "invalid", lng: 10 })))).toBeNull();
    });
  });
});
