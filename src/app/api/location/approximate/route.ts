import {
  LOCATION_COOKIE_MAX_AGE,
  LOCATION_COOKIE_NAME,
  resolveApproximateLocationFromHeaders,
  serializeLocationCookie,
} from "@/lib/location/approximate-location";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Approximate Location API Endpoint
 *
 * Provides IP-based location approximation using Cloudflare Edge Geolocation headers,
 * with fallback to timezone/locale mapping in local development.
 * Automatically persists the resolved location to the `user-location` cookie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const timezone = searchParams.get("timezone");

  const location = resolveApproximateLocationFromHeaders(request.headers, timezone);

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
