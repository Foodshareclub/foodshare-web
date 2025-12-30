/**
 * Challenge Leaderboard React Query Hooks
 *
 * Client-side caching and state management for the leaderboard.
 * Uses Server Actions instead of API routes for better performance.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchChallengeLeaderboard,
  fetchCurrentUserRank,
  fetchLeaderboardUserProfile,
} from "@/app/actions/challenges";
import type {
  LeaderboardUser,
  LeaderboardUserProfile,
  UserRankInfo,
} from "@/components/challenges/ChallengeLeaderboard/types";

// ============================================================================
// Query Keys
// ============================================================================

export const leaderboardKeys = {
  all: ["challenge-leaderboard"] as const,
  list: () => [...leaderboardKeys.all, "list"] as const,
  user: (id: string) => [...leaderboardKeys.all, "user", id] as const,
  currentUserRank: () => [...leaderboardKeys.all, "current-user-rank"] as const,
};

// ============================================================================
// Cache Configuration
// Optimized for live competition experience with Realtime updates
// ============================================================================

const CACHE_TIMES = {
  LEADERBOARD: 30 * 1000, // 30 seconds - live competition needs fresh data
  USER_PROFILE: 2 * 60 * 1000, // 2 minutes - profiles edited more frequently
  CURRENT_RANK: 30 * 1000, // 30 seconds - show rank changes quickly
} as const;

// ============================================================================
// Hooks (using Server Actions directly)
// ============================================================================

/**
 * Hook to fetch challenge leaderboard
 * Supports server-side initial data for SSR
 */
export function useChallengeLeaderboard(initialData?: LeaderboardUser[]) {
  return useQuery({
    queryKey: leaderboardKeys.list(),
    queryFn: () => fetchChallengeLeaderboard(),
    staleTime: CACHE_TIMES.LEADERBOARD,
    gcTime: CACHE_TIMES.LEADERBOARD * 5,
    initialData,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch detailed user profile for modal
 */
export function useLeaderboardUserProfile(userId: string | null) {
  return useQuery({
    queryKey: leaderboardKeys.user(userId || ""),
    queryFn: () => fetchLeaderboardUserProfile(userId!),
    enabled: !!userId,
    staleTime: CACHE_TIMES.USER_PROFILE,
    gcTime: CACHE_TIMES.USER_PROFILE * 3,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch current user's rank
 */
export function useCurrentUserRank(initialData?: UserRankInfo | null) {
  return useQuery({
    queryKey: leaderboardKeys.currentUserRank(),
    queryFn: () => fetchCurrentUserRank(),
    staleTime: CACHE_TIMES.CURRENT_RANK,
    gcTime: CACHE_TIMES.CURRENT_RANK * 5,
    initialData,
  });
}
