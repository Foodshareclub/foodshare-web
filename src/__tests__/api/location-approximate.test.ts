import { describe, expect, it } from "bun:test";
import { GET } from "@/app/api/location/approximate/route";
import { LOCATION_COOKIE_NAME, parseLocationCookie } from "@/lib/location/approximate-location";
import { NextRequest } from "next/server";

describe("GET /api/location/approximate", () => {
  it("resolves location from Cloudflare edge headers and sets cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/location/approximate", {
      headers: {
        "cf-iplatitude": "38.5816",
        "cf-iplongitude": "-121.4944",
        "cf-ipcity": "Sacramento",
        "cf-ipcountry": "US",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.latitude).toBeCloseTo(38.5816, 2);
    expect(data.location.longitude).toBeCloseTo(-121.4944, 2);
    expect(data.location.city).toBe("Sacramento");
    expect(data.location.country).toBe("US");
    expect(data.location.source).toBe("ip");
    expect(data.location.approximate).toBe(true);

    // Verify cookie on response
    const cookie = response.cookies.get(LOCATION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeDefined();

    // Parse the cookie to ensure round-trip integrity
    const parsedCookie = parseLocationCookie(cookie?.value);
    expect(parsedCookie).not.toBeNull();
    expect(parsedCookie?.latitude).toBeCloseTo(38.5816, 2);
    expect(parsedCookie?.longitude).toBeCloseTo(-121.4944, 2);
    expect(parsedCookie?.city).toBe("Sacramento");
  });

  it("resolves location from Vercel edge headers", async () => {
    const request = new NextRequest("http://localhost:3000/api/location/approximate", {
      headers: {
        "x-vercel-ip-latitude": "37.7749",
        "x-vercel-ip-longitude": "-122.4194",
        "x-vercel-ip-city": "San%20Francisco",
        "x-vercel-ip-country": "US",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.city).toBe("San Francisco");
    expect(data.location.latitude).toBeCloseTo(37.7749, 2);
    expect(data.location.longitude).toBeCloseTo(-122.4194, 2);
  });

  it("resolves location via public IP geolocation when edge headers are absent", async () => {
    // Calling without edge headers triggers real IP geolocation
    const request = new NextRequest("http://localhost:3000/api/location/approximate");

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.source).toBe("ip");
    expect(data.location.approximate).toBe(true);
    expect(typeof data.location.latitude).toBe("number");
    expect(typeof data.location.longitude).toBe("number");
    expect(typeof data.location.city).toBe("string");
  });
});
