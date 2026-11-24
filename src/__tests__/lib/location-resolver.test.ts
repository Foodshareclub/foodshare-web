import { describe, expect, it } from "bun:test";
import {
  type ApproximateLocation,
  isStaleFallbackLocation,
  isValidCoordinates,
  parseLocationCookie,
  resolveApproximateLocationFromHeaders,
  resolveLocationFromTimezone,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";

describe("approximate-location library", () => {
  describe("isValidCoordinates", () => {
    it("validates proper coordinate bounds", () => {
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(52.52, 13.405)).toBe(true);
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

  describe("resolveApproximateLocationFromHeaders", () => {
    it("extracts coordinates and city from Cloudflare headers", () => {
      const headers = new Map([
        ["cf-iplatitude", "40.7128"],
        ["cf-iplongitude", "-74.0060"],
        ["cf-ipcity", "New%20York"],
        ["cf-ipcountry", "US"],
      ]);

      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).not.toBeNull();
      expect(loc?.latitude).toBeCloseTo(40.7128, 4);
      expect(loc?.longitude).toBeCloseTo(-74.006, 4);
      expect(loc?.city).toBe("New York");
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

    it("returns null if headers and timezone are absent", () => {
      const headers = new Map<string, string>();
      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null });
      expect(loc).toBeNull();
    });

    it("falls back to timezone when Cloudflare headers are out of bounds", () => {
      const headers = new Map([
        ["cf-iplatitude", "999.0"],
        ["cf-iplongitude", "999.0"],
      ]);

      const loc = resolveApproximateLocationFromHeaders({ get: (k) => headers.get(k) || null }, "Europe/Berlin");
      expect(loc).not.toBeNull();
      expect(loc?.latitude).toBeCloseTo(52.52, 2);
      expect(loc?.longitude).toBeCloseTo(13.405, 2);
      expect(loc?.city).toBe("Berlin");
    });
  });

  describe("isStaleFallbackLocation", () => {
    it("identifies legacy Berlin fallback as stale when client timezone is in US", () => {
      const staleBerlin: ApproximateLocation = {
        latitude: 52.52,
        longitude: 13.405,
        city: "Berlin",
        country: "DE",
        source: "ip",
        approximate: true,
      };

      expect(isStaleFallbackLocation(staleBerlin, "America/Los_Angeles")).toBe(true);
      expect(isStaleFallbackLocation(staleBerlin, "America/New_York")).toBe(true);
      expect(isStaleFallbackLocation(staleBerlin, "Europe/Berlin")).toBe(false);
    });

    it("does not flag GPS precise locations as stale", () => {
      const gpsLocation: ApproximateLocation = {
        latitude: 52.52,
        longitude: 13.405,
        city: "Berlin",
        country: "DE",
        source: "gps",
        approximate: false,
      };

      expect(isStaleFallbackLocation(gpsLocation, "America/Los_Angeles")).toBe(false);
    });
  });

  describe("serializeLocationCookie & parseLocationCookie", () => {
    it("round-trips location data accurately through cookie string", () => {
      const loc: ApproximateLocation = {
        latitude: 51.5074,
        longitude: -0.1278,
        city: "London",
        country: "GB",
        source: "ip",
        approximate: true,
      };

      const serialized = serializeLocationCookie(loc);
      expect(typeof serialized).toBe("string");

      const parsed = parseLocationCookie(serialized);
      expect(parsed).not.toBeNull();
      expect(parsed?.latitude).toBeCloseTo(51.5074, 4);
      expect(parsed?.longitude).toBeCloseTo(-0.1278, 4);
      expect(parsed?.city).toBe("London");
      expect(parsed?.country).toBe("GB");
      expect(parsed?.source).toBe("ip");
      expect(parsed?.approximate).toBe(true);
    });

    it("handles invalid or corrupted cookie strings gracefully", () => {
      expect(parseLocationCookie(null)).toBeNull();
      expect(parseLocationCookie("")).toBeNull();
      expect(parseLocationCookie("not-a-json")).toBeNull();
      expect(parseLocationCookie(encodeURIComponent(JSON.stringify({ lat: "invalid", lng: 10 })))).toBeNull();
    });
  });

  describe("resolveLocationFromTimezone", () => {
    it("resolves specific known timezones", () => {
      const nz = resolveLocationFromTimezone("Pacific/Auckland");
      expect(nz).not.toBeNull();
      expect(nz?.city).toBe("Auckland");
      expect(nz?.country).toBe("NZ");
      expect(nz?.coords[0]).toBeCloseTo(-36.8485, 2);
    });

    it("resolves region default for unspecified cities within region", () => {
      const res = resolveLocationFromTimezone("America/Belize");
      expect(res).not.toBeNull();
      expect(res?.country).toBe("US"); // America region default
    });

    it("falls back to default fallback when timezone is unknown string", () => {
      const res = resolveLocationFromTimezone("Unknown/Timezone");
      expect(res).not.toBeNull();
      expect(res?.city).toBe("United States");
      expect(res?.country).toBe("US");
    });

    it("returns null when timezone is null or undefined", () => {
      expect(resolveLocationFromTimezone(null)).toBeNull();
      expect(resolveLocationFromTimezone(undefined)).toBeNull();
    });
  });
});
