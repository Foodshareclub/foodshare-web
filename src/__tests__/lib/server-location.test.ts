import { describe, expect, it, mock } from "bun:test";
import { LOCATION_COOKIE_NAME, serializeLocationCookie } from "@/lib/location/approximate-location";

// Per-test state for next/headers
let mockHeaders = new Map<string, string>();
let mockCookies = new Map<string, string>();

mock.module("next/headers", () => ({
  headers: () => Promise.resolve(mockHeaders),
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (mockCookies.has(name) ? { value: mockCookies.get(name)! } : undefined),
      set: (name: string, value: string) => mockCookies.set(name, value),
      has: (name: string) => mockCookies.has(name),
    }),
}));

const { resolveServerLocation } = await import("@/lib/location/server-location");

describe("resolveServerLocation (Zero-Hardcoding Architecture)", () => {
  it("prioritizes legitimate direct URL search parameters", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const result = await resolveServerLocation({
      searchParams: { lat: "48.8566", lng: "2.3522", radius: "3000" },
      defaultRadius: 5000,
    });

    expect(result).not.toBeNull();
    expect(result?.lat).toBeCloseTo(48.8566, 4);
    expect(result?.lng).toBeCloseTo(2.3522, 4);
    expect(result?.radius).toBe(3000);
    expect(result?.source).toBe("manual");
    expect(result?.approximate).toBe(false);
  });

  it("rejects legacy hardcoded Berlin coordinates in URL search parameters", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const result = await resolveServerLocation({
      searchParams: { lat: "52.520000", lng: "13.405000", radius: "5000" },
      defaultRadius: 5000,
    });

    // Stale auto-injected URL is rejected; returns null
    expect(result).toBeNull();
  });

  it("returns null if distance=any is explicitly specified", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const result = await resolveServerLocation({
      searchParams: { distance: "any", lat: "48.8566", lng: "2.3522" },
      defaultRadius: 5000,
    });

    expect(result).toBeNull();
  });

  it("falls back to location cookie if URL coords are absent", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const cookieData = serializeLocationCookie({
      latitude: 38.5816,
      longitude: -121.4944,
      city: "Sacramento",
      country: "US",
      source: "ip",
      approximate: true,
    });
    mockCookies.set(LOCATION_COOKIE_NAME, cookieData);

    const result = await resolveServerLocation({
      searchParams: {},
      defaultRadius: 5000,
    });

    expect(result).not.toBeNull();
    expect(result?.lat).toBeCloseTo(38.5816, 2);
    expect(result?.lng).toBeCloseTo(-121.4944, 2);
    expect(result?.city).toBe("Sacramento");
    expect(result?.country).toBe("US");
    expect(result?.source).toBe("ip");
    expect(result?.approximate).toBe(true);
  });

  it("unconditionally rejects legacy Berlin fallback cookie", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const staleCookie = serializeLocationCookie({
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
      country: "DE",
      source: "ip",
      approximate: true,
    });
    mockCookies.set(LOCATION_COOKIE_NAME, staleCookie);

    const result = await resolveServerLocation({
      searchParams: {},
      defaultRadius: 5000,
    });

    expect(result).toBeNull();
  });

  it("returns null when cookie and edge headers are absent (no fake Berlin default)", async () => {
    mockCookies.clear();
    mockHeaders.clear();

    const result = await resolveServerLocation({
      searchParams: {},
      defaultRadius: 5000,
    });

    expect(result).toBeNull();
  });

  it("falls back to Cloudflare edge headers if cookie is absent", async () => {
    mockCookies.clear();
    mockHeaders.clear();
    mockHeaders.set("cf-iplatitude", "38.5816");
    mockHeaders.set("cf-iplongitude", "-121.4944");
    mockHeaders.set("cf-ipcity", "Sacramento");
    mockHeaders.set("cf-ipcountry", "US");

    const result = await resolveServerLocation({
      searchParams: {},
      defaultRadius: 5000,
    });

    expect(result).not.toBeNull();
    expect(result?.lat).toBeCloseTo(38.5816, 4);
    expect(result?.lng).toBeCloseTo(-121.4944, 4);
    expect(result?.city).toBe("Sacramento");
    expect(result?.country).toBe("US");
    expect(result?.source).toBe("ip");
    expect(result?.approximate).toBe(true);
  });

  it("falls back to Vercel edge headers if cookie is absent", async () => {
    mockCookies.clear();
    mockHeaders.clear();
    mockHeaders.set("x-vercel-ip-latitude", "38.5816");
    mockHeaders.set("x-vercel-ip-longitude", "-121.4944");
    mockHeaders.set("x-vercel-ip-city", "Sacramento");
    mockHeaders.set("x-vercel-ip-country", "US");

    const result = await resolveServerLocation({
      searchParams: {},
      defaultRadius: 5000,
    });

    expect(result).not.toBeNull();
    expect(result?.lat).toBeCloseTo(38.5816, 4);
    expect(result?.lng).toBeCloseTo(-121.4944, 4);
    expect(result?.city).toBe("Sacramento");
    expect(result?.country).toBe("US");
  });
});
