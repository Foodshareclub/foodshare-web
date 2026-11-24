import {
  type ApproximateLocation,
  LOCATION_COOKIE_MAX_AGE,
  LOCATION_COOKIE_NAME,
  resolveApproximateLocationFromHeaders,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";
import { resolvePublicIpLocation } from "@/lib/location/ip-geolocator";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Approximate Location API Endpoint (Zero-Hardcoding Architecture)
 *
 * Resolves approximate user location using pure dynamic signals:
 * 1. Edge Geolocation Headers (Cloudflare cf-* or Vercel x-vercel-ip-*)
 * 2. Dynamic Public IP Geolocation lookup (ipwho.is with 24h cache and 2.5s timeout)
 *
 * Zero static city dictionaries or hardcoded coordinates.
 * Automatically persists the resolved location to the `user-location` cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let location: ApproximateLocation | null = null;

  // 1. Direct Edge Headers (Cloudflare or Vercel)
  const hasEdgeHeaders =
    Boolean(request.headers.get("cf-iplatitude") && request.headers.get("cf-iplongitude")) ||
    Boolean(request.headers.get("x-vercel-ip-latitude") && request.headers.get("x-vercel-ip-longitude"));

  if (hasEdgeHeaders) {
    location = resolveApproximateLocationFromHeaders(request.headers);
  }

  // 2. Dynamic Public IP Geolocation lookup (for local dev, staging, or non-edge hosting)
  if (!location) {
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip");

    location = await resolvePublicIpLocation(clientIp);
  }

  if (!location) {
    return NextResponse.json(
      {
        success: false,
        location: null,
      },
      { status: 404 },
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      location,
    },
    {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    },
  );

  response.cookies.set(LOCATION_COOKIE_NAME, serializeLocationCookie(location), {
    path: "/",
    maxAge: LOCATION_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
