/**
 * Debug endpoint to verify admin status
 * DELETE THIS AFTER DEBUGGING
 */

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/data/auth";

export async function GET() {
  try {
    const session = await getAuthSession();

    return NextResponse.json({
      isAuthenticated: session.isAuthenticated,
      isAdmin: session.isAdmin,
      roles: session.roles,
      userId: session.user?.id,
      email: session.user?.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
