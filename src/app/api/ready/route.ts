/**
 * Ready API Route
 * Health check endpoint with standardized response type
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/api-types";

/**
 * GET /api/ready
 * Simple readiness check endpoint
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ status: string }>>> {
  return NextResponse.json({ success: true, data: { status: "ready" } }, { status: 200 });
}
