/**
 * Active Challenges API Route
 *
 * GET /api/challenges/active
 * Returns the authenticated user's active (uncompleted) challenges
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get active challenges for the user
    const { data: participants, error } = await supabase
      .from("challenge_participants")
      .select(
        `
        id,
        challenge_id,
        accepted_at,
        challenges!inner (
          id,
          challenge_title,
          challenge_description,
          challenge_difficulty,
          challenge_score,
          challenge_image
        )
      `
      )
      .eq("profile_id", user.id)
      .eq("is_completed", false)
      .order("accepted_at", { ascending: false });

    if (error) {
      console.error("Error fetching active challenges:", error);
      return NextResponse.json({ error: "Failed to fetch active challenges" }, { status: 500 });
    }

    // Transform the data
    const activeChallenges = (participants || []).map((p) => {
      const challengeData = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
      const challenge = challengeData as {
        id: number;
        challenge_title: string;
        challenge_description: string;
        challenge_difficulty: string;
        challenge_score: string | number;
        challenge_image: string;
      };

      return {
        id: p.id,
        challengeId: challenge.id,
        title: challenge.challenge_title,
        description: challenge.challenge_description,
        difficulty: challenge.challenge_difficulty,
        score:
          typeof challenge.challenge_score === "string"
            ? parseInt(challenge.challenge_score, 10)
            : challenge.challenge_score,
        image: challenge.challenge_image,
        acceptedAt: p.accepted_at,
      };
    });

    return NextResponse.json(activeChallenges);
  } catch (error) {
    console.error("Error in active challenges API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
