import { describe, expect, it } from "bun:test";
import { GET } from "@/app/api/location/approximate/route";
import { LOCATION_COOKIE_NAME, parseLocationCookie } from "@/lib/location/approximate-location";
import { NextRequest } from "next/server";

describe("GET /api/location/approximate", () => {
  it("resolves location from Cloudflare edge headers and sets cookie", async () => {
    const request = new NextRequest("http://localhost:3000/api/location/approximate", {
      headers: {
        "cf-iplatitude": "52.5200",
        "cf-iplongitude": "13.4050",
        "cf-ipcity": "Berlin",
        "cf-ipcountry": "DE",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.latitude).toBeCloseTo(52.52, 2);
    expect(data.location.longitude).toBeCloseTo(13.405, 2);
    expect(data.location.city).toBe("Berlin");
    expect(data.location.country).toBe("DE");
    expect(data.location.source).toBe("ip");
    expect(data.location.approximate).toBe(true);

    // Verify cookie on response
    const cookie = response.cookies.get(LOCATION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeDefined();

    // Parse the cookie to ensure round-trip integrity
    const parsedCookie = parseLocationCookie(cookie?.value);
    expect(parsedCookie).not.toBeNull();
    expect(parsedCookie?.latitude).toBeCloseTo(52.52, 2);
    expect(parsedCookie?.longitude).toBeCloseTo(13.405, 2);
    expect(parsedCookie?.city).toBe("Berlin");
  });

  it("falls back to timezone parameter when Cloudflare headers are absent", async () => {
    const request = new NextRequest("http://localhost:3000/api/location/approximate?timezone=America%2FLos_Angeles");

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.latitude).toBeCloseTo(34.0522, 2);
    expect(data.location.longitude).toBeCloseTo(-118.2437, 2);
    expect(data.location.city).toBe("Los Angeles");
    expect(data.location.country).toBe("US");
    expect(data.location.approximate).toBe(true);
  });

  it("handles regional timezone fallback gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/location/approximate?timezone=Europe%2FBratislava");

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.location.country).toBe("EU");
    expect(data.location.approximate).toBe(true);
  });
});
