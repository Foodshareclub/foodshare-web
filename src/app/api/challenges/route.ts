import { NextRequest, NextResponse } from "next/server";
import { getChallengesPaginated } from "@/lib/data/challenges";

/**
 * GET /api/challenges
 * Paginated challenges endpoint for lazy loading
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 12)
 * - difficulty: string (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "12", 10);
    const difficulty = searchParams.get("difficulty") ?? undefined;

    // Validate params
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const result = await getChallengesPaginated({ page, limit, difficulty });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}
