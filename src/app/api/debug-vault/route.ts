import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint - DISABLED for security
 * This endpoint was exposing sensitive secret metadata.
 * Re-enable only in development with proper auth if needed.
 */
export async function GET() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "This endpoint is disabled in production" }, { status: 403 });
  }

  // In development, only return safe metadata
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    message: "Debug endpoint - limited info in dev mode",
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
