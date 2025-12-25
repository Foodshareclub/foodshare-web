import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) file for Universal Links
 * This enables deep linking from foodshare.club to the iOS app
 *
 * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
 */
export async function GET() {
  const aasa = {
    applinks: {
      apps: [], // Must be empty array per Apple spec
      details: [
        {
          appID: "DCKVD6LKYV.com.flutterflow.foodshare",
          paths: [
            // Content routes
            "/food/*",
            "/profile/*",
            "/messages/*",
            "/challenge/*",
            "/forum/*",
            "/map/*",
            // User routes
            "/my-posts",
            "/my-posts/*",
            "/chat",
            "/chat/*",
            "/settings",
            "/settings/*",
            "/notifications",
            // Community routes
            "/donation",
            "/help",
            "/feedback",
            // Legal/info routes
            "/privacy",
            "/terms",
          ],
        },
      ],
    },
    webcredentials: {
      apps: ["DCKVD6LKYV.com.flutterflow.foodshare"],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
