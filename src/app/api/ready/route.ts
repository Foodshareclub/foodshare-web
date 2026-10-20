/**
 * Ready API Route
 * Health check endpoint with standardized response type
 */

import type { ApiResponse } from "@/lib/api-types";
import { NextResponse } from "next/server";

/**
 * GET /api/ready
 * Simple readiness check endpoint
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ status: string }>>> {
  return NextResponse.json({ success: true, data: { status: "ready" } }, { status: 200 });
}
