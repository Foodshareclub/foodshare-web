/**
 * Challenge Leaderboard Data Functions
 *
 * Server-side cached data fetching for the challenge leaderboard.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient, createCachedClient } from "@/lib/supabase/server";
import {
  type LeaderboardUser,
  type LeaderboardUserProfile,
  type UserRankInfo,
  type RecentChallenge,
} from "@/components/challenges/ChallengeLeaderboard/types";
import {
  getTierFromCount,
  LEADERBOARD_LIMIT,
  RECENT_CHALLENGES_LIMIT,
} from "@/components/challenges/ChallengeLeaderboard/constants";

// ============================================================================
// Leaderboard Data
// ============================================================================

interface RawLeaderboardRow {
  profile_id: string;
  nickname: string | null;
  first_name: string | null;
  avatar_url: string | null;
  completed_count: number;
  active_count: number;
  total_xp: number;
  last_completed: string | null;
}

/**
 * Get challenge leaderboard - top users by completed challenges
 * Uses optimized RPC function with fallback to manual query
 */
export const getChallengeLeaderboard = unstable_cache(
  async (limit: number = LEADERBOARD_LIMIT): Promise<LeaderboardUser[]> => {
    const supabase = createCachedClient();

    // Query with optimized RPC function
    const { data, error } = await supabase.rpc("get_challenge_leaderboard", {
      limit_count: limit,
    });

    // If RPC doesn't exist, fall back to manual query
    if (error?.code === "42883" || error?.code === "PGRST202") {
      console.warn("Leaderboard RPC not found, using manual query");
      return getLeaderboardManual(limit);
    }

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return getLeaderboardManual(limit); // Fallback on any error
    }

    return transformLeaderboardData(data || []);
  },
  ["challenge-leaderboard"],
  {
    revalidate: CACHE_DURATIONS.CHALLENGE_LEADERBOARD,
    tags: [CACHE_TAGS.CHALLENGE_LEADERBOARD],
  }
);

/**
 * Manual leaderboard query fallback
 */
async function getLeaderboardManual(limit: number): Promise<LeaderboardUser[]> {
  const supabase = createCachedClient();

  // Get all participants with their challenge data
  const { data: participants, error } = await supabase.from("challenge_participants").select(`
      profile_id,
      is_completed,
      completed_at,
      challenges!inner (
        challenge_score
      ),
      profiles!inner (
        nickname,
        first_name,
        avatar_url
      )
    `);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  // Aggregate by user
  const userMap = new Map<
    string,
    {
      profile_id: string;
      nickname: string | null;
      first_name: string | null;
      avatar_url: string | null;
      completed_count: number;
      active_count: number;
      total_xp: number;
      last_completed: string | null;
    }
  >();

  for (const p of participants || []) {
    const existing = userMap.get(p.profile_id);
    // Handle joined data - could be array or object depending on Supabase response
    const profileData = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const challengeData = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
    const profile = profileData as {
      nickname: string | null;
      first_name: string | null;
      avatar_url: string | null;
    } | null;
    const challenge = challengeData as { challenge_score: string | number } | null;
    const xp = challenge
      ? typeof challenge.challenge_score === "string"
        ? parseInt(challenge.challenge_score, 10)
        : challenge.challenge_score
      : 0;

    if (existing) {
      if (p.is_completed) {
        existing.completed_count += 1;
        existing.total_xp += xp || 0;
        if (
          !existing.last_completed ||
          (p.completed_at && p.completed_at > existing.last_completed)
        ) {
          existing.last_completed = p.completed_at;
        }
      } else {
        existing.active_count += 1;
      }
    } else {
      userMap.set(p.profile_id, {
        profile_id: p.profile_id,
        nickname: profile?.nickname ?? null,
        first_name: profile?.first_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        completed_count: p.is_completed ? 1 : 0,
        active_count: p.is_completed ? 0 : 1,
        total_xp: p.is_completed ? xp || 0 : 0,
        last_completed: p.is_completed ? p.completed_at : null,
      });
    }
  }

  // Sort and limit
  const sorted = Array.from(userMap.values())
    .filter((u) => u.completed_count > 0)
    .sort((a, b) => {
      if (b.completed_count !== a.completed_count) {
        return b.completed_count - a.completed_count;
      }
      return b.total_xp - a.total_xp;
    })
    .slice(0, limit);

  return transformLeaderboardData(sorted);
}

/**
 * Transform raw data to LeaderboardUser[]
 */
function transformLeaderboardData(data: RawLeaderboardRow[]): LeaderboardUser[] {
  return data.map((row, index) => ({
    id: row.profile_id,
    rank: index + 1,
    nickname: row.nickname,
    firstName: row.first_name,
    avatarUrl: row.avatar_url,
    completedCount: row.completed_count,
    activeCount: row.active_count,
    totalXpEarned: row.total_xp,
    tier: getTierFromCount(row.completed_count),
    lastCompletedAt: row.last_completed,
  }));
}

// ============================================================================
// User Profile Data
// ============================================================================

/**
 * Get detailed profile for leaderboard modal
 * Uses optimized RPC function with fallback to manual query
 */
export const getLeaderboardUserProfile = unstable_cache(
  async (userId: string): Promise<LeaderboardUserProfile | null> => {
    const supabase = createCachedClient();

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_leaderboard_user_profile", {
      user_id: userId,
    });

    // If RPC works and returns data
    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0];
      const recentChallenges: RecentChallenge[] = (row.recent_challenges || []).map(
        (c: {
          id: number;
          title: string;
          difficulty: string;
          xp: number;
          completedAt: string;
        }) => ({
          id: c.id,
          title: c.title,
          difficulty: c.difficulty,
          xp: typeof c.xp === "string" ? parseInt(c.xp, 10) : c.xp,
          completedAt: c.completedAt || "",
        })
      );

      return {
        id: row.profile_id,
        rank: row.user_rank || 0,
        nickname: row.nickname,
        firstName: row.first_name,
        avatarUrl: row.avatar_url,
        completedCount: Number(row.completed_count) || 0,
        activeCount: Number(row.active_count) || 0,
        totalXpEarned: Number(row.total_xp) || 0,
        tier: getTierFromCount(Number(row.completed_count) || 0),
        lastCompletedAt: recentChallenges[0]?.completedAt || null,
        recentChallenges,
        joinedAt: row.joined_at,
        completionRate: row.completion_rate || 0,
      };
    }

    // Fallback to manual query
    return getLeaderboardUserProfileManual(userId);
  },
  ["leaderboard-user-profile"],
  {
    revalidate: CACHE_DURATIONS.CHALLENGE_LEADERBOARD,
    tags: [CACHE_TAGS.CHALLENGE_LEADERBOARD],
  }
);

/**
 * Manual user profile query fallback
 */
async function getLeaderboardUserProfileManual(
  userId: string
): Promise<LeaderboardUserProfile | null> {
  const supabase = createCachedClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname, first_name, avatar_url, created_time")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Get challenge participation stats
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select(
      `
      is_completed,
      completed_at,
      challenges!inner (
        id,
        challenge_title,
        challenge_difficulty,
        challenge_score
      )
    `
    )
    .eq("profile_id", userId)
    .order("completed_at", { ascending: false });

  let completedCount = 0;
  let activeCount = 0;
  let totalXp = 0;
  const recentChallenges: RecentChallenge[] = [];

  for (const p of participants || []) {
    const challengeData = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
    const challenge = challengeData as {
      id: number;
      challenge_title: string;
      challenge_difficulty: string;
      challenge_score: string | number;
    } | null;

    if (!challenge) continue;

    const xp =
      typeof challenge.challenge_score === "string"
        ? parseInt(challenge.challenge_score, 10)
        : challenge.challenge_score;

    if (p.is_completed) {
      completedCount += 1;
      totalXp += xp || 0;

      if (recentChallenges.length < RECENT_CHALLENGES_LIMIT) {
        recentChallenges.push({
          id: challenge.id,
          title: challenge.challenge_title,
          difficulty: challenge.challenge_difficulty,
          xp: xp || 0,
          completedAt: p.completed_at || "",
        });
      }
    } else {
      activeCount += 1;
    }
  }

  const totalChallenges = completedCount + activeCount;
  const completionRate =
    totalChallenges > 0 ? Math.round((completedCount / totalChallenges) * 100) : 0;

  // Get rank
  const leaderboard = await getChallengeLeaderboard(100);
  const userRank = leaderboard.findIndex((u) => u.id === userId) + 1;

  return {
    id: profile.id,
    rank: userRank || leaderboard.length + 1,
    nickname: profile.nickname,
    firstName: profile.first_name,
    avatarUrl: profile.avatar_url,
    completedCount,
    activeCount,
    totalXpEarned: totalXp,
    tier: getTierFromCount(completedCount),
    lastCompletedAt: recentChallenges[0]?.completedAt || null,
    recentChallenges,
    joinedAt: profile.created_time,
    completionRate,
  };
}

// ============================================================================
// Current User Rank
// ============================================================================

/**
 * Get current authenticated user's rank
 * Not cached as it's user-specific
 */
export async function getCurrentUserRank(): Promise<UserRankInfo | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, first_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Get user's challenge stats
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select(
      `
      is_completed,
      challenges!inner (
        challenge_score
      )
    `
    )
    .eq("profile_id", user.id);

  let completedCount = 0;
  let activeCount = 0;
  let totalXp = 0;

  for (const p of participants || []) {
    // Handle joined data - could be array or object depending on Supabase response
    const challengeData = Array.isArray(p.challenges) ? p.challenges[0] : p.challenges;
    const challenge = challengeData as { challenge_score: string | number } | null;

    if (!challenge) continue;

    const xp =
      typeof challenge.challenge_score === "string"
        ? parseInt(challenge.challenge_score, 10)
        : challenge.challenge_score;

    if (p.is_completed) {
      completedCount += 1;
      totalXp += xp || 0;
    } else {
      activeCount += 1;
    }
  }

  // Get full leaderboard to calculate rank
  const leaderboard = await getChallengeLeaderboard(100);
  const userIndex = leaderboard.findIndex((u) => u.id === user.id);

  let rank: number;
  if (userIndex >= 0) {
    rank = userIndex + 1;
  } else if (completedCount === 0) {
    rank = leaderboard.length + 1;
  } else {
    // User has completions but not in top 100, estimate rank
    const usersAhead = leaderboard.filter(
      (u) =>
        u.completedCount > completedCount ||
        (u.completedCount === completedCount && u.totalXpEarned > totalXp)
    ).length;
    rank = usersAhead + 1;
  }

  return {
    id: user.id,
    rank,
    completedCount,
    activeCount,
    totalXp,
    tier: getTierFromCount(completedCount),
    isInTopTen: rank <= LEADERBOARD_LIMIT,
    nickname: profile?.nickname || null,
    firstName: profile?.first_name || null,
    avatarUrl: profile?.avatar_url || null,
  };
}
