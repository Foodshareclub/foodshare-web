/**
 * Leaderboard User Profile API Route
 *
 * GET /api/challenges/leaderboard/user/[userId]
 * Returns detailed profile for a specific user
 */

import { NextResponse } from "next/server";
import { getLeaderboardUserProfile } from "@/lib/data/challenge-leaderboard";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const profile = await getLeaderboardUserProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}
