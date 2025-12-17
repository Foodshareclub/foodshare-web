/**
 * Challenge Leaderboard React Query Hooks
 *
 * Client-side caching and state management for the leaderboard.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
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
// ============================================================================

const CACHE_TIMES = {
  LEADERBOARD: 2 * 60 * 1000, // 2 minutes
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  CURRENT_RANK: 1 * 60 * 1000, // 1 minute
} as const;

// ============================================================================
// API Configuration
// ============================================================================

// Allowlist of valid API paths
const API_PATHS = {
  LEADERBOARD: "/api/challenges/leaderboard",
  LEADERBOARD_USER: "/api/challenges/leaderboard/user",
  LEADERBOARD_ME: "/api/challenges/leaderboard/me",
} as const;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const response = await fetch(API_PATHS.LEADERBOARD);
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  return response.json();
}

async function fetchUserProfile(userId: string): Promise<LeaderboardUserProfile | null> {
  // Validate userId is a valid UUID to prevent URL injection
  if (!isValidUUID(userId)) {
    throw new Error("Invalid user ID format");
  }
  const url = `${API_PATHS.LEADERBOARD_USER}/${userId}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch user profile");
  }
  return response.json();
}

async function fetchCurrentUserRank(): Promise<UserRankInfo | null> {
  const response = await fetch(API_PATHS.LEADERBOARD_ME);
  if (!response.ok) {
    if (response.status === 401) return null;
    throw new Error("Failed to fetch current user rank");
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch challenge leaderboard
 * Supports server-side initial data for SSR
 */
export function useChallengeLeaderboard(initialData?: LeaderboardUser[]) {
  return useQuery({
    queryKey: leaderboardKeys.list(),
    queryFn: fetchLeaderboard,
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
    queryFn: () => fetchUserProfile(userId!),
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
    queryFn: fetchCurrentUserRank,
    staleTime: CACHE_TIMES.CURRENT_RANK,
    gcTime: CACHE_TIMES.CURRENT_RANK * 5,
    initialData,
  });
}
