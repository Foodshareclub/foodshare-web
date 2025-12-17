/**
 * Challenge Leaderboard Types
 *
 * Type definitions for the challenge leaderboard feature.
 */

// ============================================================================
// Tier Types
// ============================================================================

export type ChallengeTier = "seedling" | "grower" | "champion" | "legend";

export interface TierConfig {
  min: number;
  max: number;
  label: string;
  emoji: string;
  color: string;
  glowColor: string;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardUser {
  id: string;
  rank: number;
  nickname: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  completedCount: number;
  activeCount: number;
  totalXpEarned: number;
  tier: ChallengeTier;
  lastCompletedAt: string | null;
}

export interface LeaderboardUserProfile extends LeaderboardUser {
  recentChallenges: RecentChallenge[];
  joinedAt: string;
  completionRate: number;
}

export interface RecentChallenge {
  id: number;
  title: string;
  difficulty: string;
  xp: number;
  completedAt: string;
}

// ============================================================================
// User Rank Types
// ============================================================================

export interface UserRankInfo {
  id: string;
  rank: number;
  completedCount: number;
  activeCount: number;
  totalXp: number;
  tier: ChallengeTier;
  isInTopTen: boolean;
  nickname: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

// ============================================================================
// Component Props
// ============================================================================

export interface ChallengeLeaderboardProps {
  initialData?: LeaderboardUser[];
  currentUserRank?: UserRankInfo | null;
  className?: string;
}

export interface LeaderboardRowProps {
  user: LeaderboardUser;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export interface LeaderboardUserModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface LeaderboardSkeletonProps {
  rows?: number;
}
