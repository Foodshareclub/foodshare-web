"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import {
  getChallengeLeaderboard as getLeaderboardData,
  getCurrentUserRank as getUserRankData,
  getLeaderboardUserProfile as getUserProfileData,
} from "@/lib/data/challenge-leaderboard";
import type {
  LeaderboardUser,
  LeaderboardUserProfile,
  UserRankInfo,
} from "@/components/challenges/ChallengeLeaderboard/types";

// ============================================================================
// Constants
// ============================================================================

const ACTIVE_CHALLENGE_SOFT_LIMIT = 5;

// ============================================================================
// Types
// ============================================================================

export type ChallengeInteraction = "accepted" | "declined" | "completed" | null;

export interface ChallengeStatus {
  interaction: ChallengeInteraction;
  interactedAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface AcceptChallengeResult {
  success: boolean;
  error?: string;
  /** Soft limit reached - user can still proceed with override */
  limitReached?: boolean;
  /** Number of active challenges */
  activeCount?: number;
  /** The soft limit value */
  limit?: number;
}

// ============================================================================
// Activity Logging (Internal)
// ============================================================================

type ActivityType = "accepted" | "rejected" | "completed";

/**
 * Log a challenge activity to challenge_activities table
 */
async function logChallengeActivity(
  challengeId: number,
  userId: string,
  activityType: ActivityType
): Promise<void> {
  const supabase = await createClient();

  const activityData: Record<string, unknown> = {
    challenge_id: challengeId,
  };

  // Set the appropriate user field based on activity type
  switch (activityType) {
    case "accepted":
      activityData.user_accepted_challenge = userId;
      break;
    case "rejected":
      activityData.user_rejected_challenge = userId;
      break;
    case "completed":
      activityData.user_completed_challenge = userId;
      break;
  }

  await supabase.from("challenge_activities").insert(activityData);
}

// ============================================================================
// Challenge Actions
// ============================================================================

/**
 * Get count of user's active (uncompleted) challenges
 */
export async function getActiveChallengeCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count } = await supabase
    .from("challenge_participants")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_completed", false);

  return count || 0;
}

/**
 * Accept a challenge - adds user to participants and logs activity
 *
 * @param challengeId - The challenge to accept
 * @param overrideLimit - Set to true to bypass the soft limit warning
 */
export async function acceptChallenge(
  challengeId: number,
  overrideLimit: boolean = false
): Promise<AcceptChallengeResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if already accepted
  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("profile_id", user.id)
    .single();

  if (existing) {
    return { success: true }; // Already accepted
  }

  // Check active challenge count (soft limit)
  const activeCount = await getActiveChallengeCount();

  if (activeCount >= ACTIVE_CHALLENGE_SOFT_LIMIT && !overrideLimit) {
    return {
      success: false,
      limitReached: true,
      activeCount,
      limit: ACTIVE_CHALLENGE_SOFT_LIMIT,
    };
  }

  // Insert participation
  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    profile_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity and update counter
  await Promise.all([
    logChallengeActivity(challengeId, user.id, "accepted"),
    supabase.rpc("increment_challenged_people", { challenge_id: challengeId }),
  ]);

  invalidateTag(CACHE_TAGS.CHALLENGES);
  revalidatePath(`/challenge/${challengeId}`);

  return { success: true, activeCount: activeCount + 1 };
}

/**
 * Decline a challenge - logs the rejection for analytics
 */
export async function declineChallenge(
  challengeId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Log the decline activity
  await logChallengeActivity(challengeId, user.id, "rejected");

  invalidateTag(CACHE_TAGS.CHALLENGES);

  return { success: true };
}

/**
 * Mark a challenge as completed
 */
export async function completeChallenge(
  challengeId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update participation record
  const { error } = await supabase
    .from("challenge_participants")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("challenge_id", challengeId)
    .eq("profile_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the completion activity
  await logChallengeActivity(challengeId, user.id, "completed");

  // Invalidate relevant caches
  invalidateTag(CACHE_TAGS.CHALLENGES);
  invalidateTag(CACHE_TAGS.CHALLENGE_LEADERBOARD);
  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/challenge");

  return { success: true };
}

// ============================================================================
// Challenge Status Queries
// ============================================================================

/**
 * Get user's interaction status with a challenge
 */
export async function getChallengeStatus(challengeId: number): Promise<ChallengeStatus> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { interaction: null, interactedAt: null, isCompleted: false, completedAt: null };
  }

  // Check if accepted (in participants table)
  const { data: participation } = await supabase
    .from("challenge_participants")
    .select("accepted_at, is_completed, completed_at")
    .eq("challenge_id", challengeId)
    .eq("profile_id", user.id)
    .single();

  if (participation) {
    return {
      interaction: participation.is_completed ? "completed" : "accepted",
      interactedAt: participation.accepted_at,
      isCompleted: participation.is_completed,
      completedAt: participation.completed_at,
    };
  }

  // Check if declined (in activities table)
  const { data: declined } = await supabase
    .from("challenge_activities")
    .select("created_at")
    .eq("challenge_id", challengeId)
    .eq("user_rejected_challenge", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (declined) {
    return {
      interaction: "declined",
      interactedAt: declined.created_at,
      isCompleted: false,
      completedAt: null,
    };
  }

  return { interaction: null, interactedAt: null, isCompleted: false, completedAt: null };
}

/**
 * Check if user has accepted a challenge (legacy helper)
 */
export async function hasAcceptedChallenge(challengeId: number): Promise<boolean> {
  const status = await getChallengeStatus(challengeId);
  return status.interaction === "accepted" || status.interaction === "completed";
}

/**
 * Get IDs of challenges user has already interacted with (accepted or declined)
 */
export async function getUserInteractedChallengeIds(): Promise<{
  accepted: number[];
  declined: number[];
  completed: number[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { accepted: [], declined: [], completed: [] };
  }

  // Get accepted/completed from participants
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("challenge_id, is_completed")
    .eq("profile_id", user.id);

  const accepted: number[] = [];
  const completed: number[] = [];

  for (const p of participants || []) {
    if (p.is_completed) {
      completed.push(p.challenge_id);
    } else {
      accepted.push(p.challenge_id);
    }
  }

  // Get declined from activities
  const { data: declinedActivities } = await supabase
    .from("challenge_activities")
    .select("challenge_id")
    .eq("user_rejected_challenge", user.id);

  const declined = [...new Set((declinedActivities || []).map((d) => d.challenge_id))];

  return { accepted, declined, completed };
}

/**
 * Toggle like on a challenge
 */
export async function toggleChallengeLike(
  challengeId: number
): Promise<{ success: boolean; isLiked: boolean; likeCount: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, isLiked: false, likeCount: 0, error: "Not authenticated" };
  }

  // Check if already liked in the likes table
  const { data: existingLike } = await supabase
    .from("likes")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("profile_id", user.id)
    .single();

  let isLiked: boolean;

  if (existingLike) {
    // Unlike - remove from likes table
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("profile_id", user.id);

    if (error) {
      return { success: false, isLiked: true, likeCount: 0, error: error.message };
    }

    isLiked = false;
  } else {
    // Like - insert into likes table
    const { error } = await supabase.from("likes").insert({
      challenge_id: challengeId,
      profile_id: user.id,
    });

    if (error) {
      return { success: false, isLiked: false, likeCount: 0, error: error.message };
    }

    isLiked = true;
  }

  // Get updated count
  const { count } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  const likeCount = count || 0;

  // Update the counter on the challenges table for denormalized access
  await supabase
    .from("challenges")
    .update({ challenge_likes_counter: likeCount })
    .eq("id", challengeId);

  invalidateTag(CACHE_TAGS.CHALLENGES);
  revalidatePath(`/challenge/${challengeId}`);

  return { success: true, isLiked, likeCount };
}

/**
 * Check if user has liked a challenge
 */
export async function checkChallengeLiked(
  challengeId: number
): Promise<{ isLiked: boolean; likeCount: number }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get like count
  const { count } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  const likeCount = count || 0;

  // Check if user liked (if authenticated)
  let isLiked = false;
  if (user) {
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("profile_id", user.id)
      .single();

    isLiked = !!existingLike;
  }

  return { isLiked, likeCount };
}

// ============================================================================
// Leaderboard Server Actions (replaces API routes)
// ============================================================================

/**
 * Get challenge leaderboard - Server Action wrapper
 * Replaces: GET /api/challenges/leaderboard
 */
export async function fetchChallengeLeaderboard(limit?: number): Promise<LeaderboardUser[]> {
  return getLeaderboardData(limit);
}

/**
 * Get current user's rank - Server Action wrapper
 * Replaces: GET /api/challenges/leaderboard/me
 */
export async function fetchCurrentUserRank(): Promise<UserRankInfo | null> {
  return getUserRankData();
}

/**
 * Get user profile for leaderboard modal - Server Action wrapper
 * Replaces: GET /api/challenges/leaderboard/user/[userId]
 */
export async function fetchLeaderboardUserProfile(
  userId: string
): Promise<LeaderboardUserProfile | null> {
  return getUserProfileData(userId);
}
