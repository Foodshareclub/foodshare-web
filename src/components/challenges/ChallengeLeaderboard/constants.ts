/**
 * Challenge Leaderboard Constants
 *
 * Configuration for tiers, scoring, and display settings.
 */

import type { ChallengeTier, TierConfig } from "./types";

// ============================================================================
// Tier Configuration
// ============================================================================

export const CHALLENGE_TIERS: Record<ChallengeTier, TierConfig> = {
  seedling: {
    min: 1,
    max: 2,
    label: "Seedling",
    emoji: "🌱",
    color: "text-green-400",
    glowColor: "shadow-green-400/50",
  },
  grower: {
    min: 3,
    max: 5,
    label: "Grower",
    emoji: "🌿",
    color: "text-emerald-400",
    glowColor: "shadow-emerald-400/50",
  },
  champion: {
    min: 6,
    max: 10,
    label: "Champion",
    emoji: "🌳",
    color: "text-teal-400",
    glowColor: "shadow-teal-400/50",
  },
  legend: {
    min: 11,
    max: Infinity,
    label: "Legend",
    emoji: "🏆",
    color: "text-amber-400",
    glowColor: "shadow-amber-400/50",
  },
} as const;

// ============================================================================
// XP Configuration
// ============================================================================

export const XP_BY_DIFFICULTY: Record<string, number> = {
  Easy: 10,
  Medium: 25,
  Hard: 50,
} as const;

// ============================================================================
// Display Configuration
// ============================================================================

export const LEADERBOARD_LIMIT = 10;
export const RECENT_CHALLENGES_LIMIT = 5;

// Rank badge colors for top 3
export const RANK_COLORS = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800",
  3: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900",
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the tier for a given completed count
 */
export function getTierFromCount(completedCount: number): ChallengeTier {
  if (completedCount >= CHALLENGE_TIERS.legend.min) return "legend";
  if (completedCount >= CHALLENGE_TIERS.champion.min) return "champion";
  if (completedCount >= CHALLENGE_TIERS.grower.min) return "grower";
  if (completedCount >= CHALLENGE_TIERS.seedling.min) return "seedling";
  return "seedling"; // Default for 0 completions
}

/**
 * Get tier configuration for a tier
 */
export function getTierConfig(tier: ChallengeTier): TierConfig {
  return CHALLENGE_TIERS[tier];
}

/**
 * Calculate XP from difficulty
 */
export function getXpFromDifficulty(difficulty: string): number {
  return XP_BY_DIFFICULTY[difficulty] || 10;
}

/**
 * Format XP with suffix (e.g., 1.2K)
 */
export function formatXp(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return xp.toString();
}

/**
 * Get rank badge styling
 */
export function getRankBadgeClass(rank: number): string {
  if (rank <= 3) {
    return RANK_COLORS[rank as 1 | 2 | 3];
  }
  return "bg-muted text-muted-foreground";
}
