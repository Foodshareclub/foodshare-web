/**
 * Challenges API Route
 * Provides paginated challenge data with consistent API response types
 * Uses bleeding-edge Next.js 16 patterns with type-safe responses
 */

import { NextRequest, NextResponse } from "next/server";
import { getChallengesPaginated } from "@/lib/data/challenges";
import type { ApiResponse } from "@/lib/api-types";

/**
 * GET /api/challenges
 * Fetches paginated challenges with proper type safety
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  const { searchParams } = new URL(request.url);
  const requestedPage = Number(searchParams.get("page") || "1");
  const requestedLimit = Number(searchParams.get("limit") || "20");
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
    : 20;

  const challenges = await getChallengesPaginated({
    page,
    limit,
    difficulty: searchParams.get("difficulty") || undefined,
    searchTerm: searchParams.get("key_word") || undefined,
  });

  if (!challenges) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: challenges }, { status: 200 });
}
