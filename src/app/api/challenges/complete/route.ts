/**
 * Complete Challenge API Route
 *
 * POST /api/challenges/complete
 * Marks a challenge as completed for the authenticated user
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { completeChallenge } from "@/app/actions/challenges";

// Schema validation for request body
const completeChallengeSchema = z.object({
  challengeId: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = completeChallengeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { challengeId } = parseResult.data;

    const result = await completeChallenge(challengeId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to complete challenge" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing challenge:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
