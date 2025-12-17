/**
 * Challenge Leaderboard API Route
 *
 * GET /api/challenges/leaderboard
 * Returns top users by challenge completions
 */

import { NextResponse } from "next/server";
import { getChallengeLeaderboard } from "@/lib/data/challenge-leaderboard";

export async function GET() {
  try {
    const leaderboard = await getChallengeLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
