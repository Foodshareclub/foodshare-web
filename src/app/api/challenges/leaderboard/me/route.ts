/**
 * Current User Rank API Route
 *
 * GET /api/challenges/leaderboard/me
 * Returns the authenticated user's rank and stats
 */

import { NextResponse } from "next/server";
import { getCurrentUserRank } from "@/lib/data/challenge-leaderboard";

export async function GET() {
  try {
    const userRank = await getCurrentUserRank();

    if (!userRank) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(userRank);
  } catch (error) {
    console.error("Error fetching user rank:", error);
    return NextResponse.json({ error: "Failed to fetch user rank" }, { status: 500 });
  }
}
