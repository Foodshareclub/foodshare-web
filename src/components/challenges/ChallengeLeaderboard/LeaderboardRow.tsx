/**
 * Leaderboard Row Component
 *
 * Individual row displaying user rank, avatar, name, tier, and stats.
 * Features GPU-optimized hover animations and accessibility support.
 */

"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Flame } from "lucide-react";
import { rowVariants, rowGlowVariants, rankBadgeVariants, avatarVariants } from "./animations";
import { getTierConfig, getRankBadgeClass, formatXp } from "./constants";
import type { LeaderboardRowProps } from "./types";
import { cn } from "@/lib/utils";

export function LeaderboardRow({ user, isCurrentUser = false, onClick }: LeaderboardRowProps) {
  const tierConfig = getTierConfig(user.tier);
  const displayName = user.nickname || user.firstName || "Anonymous";

  return (
    <motion.button
      className={cn(
        "relative w-full flex items-center gap-3 p-2 rounded-lg",
        "text-left transition-colors",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isCurrentUser && "ring-2 ring-primary/50 bg-primary/5"
      )}
      variants={rowVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      aria-label={`View ${displayName}'s profile. Rank ${user.rank}, ${user.completedCount} challenges completed`}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none"
        variants={rowGlowVariants}
        initial="initial"
      />

      {/* Rank Badge */}
      <motion.div
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0",
          getRankBadgeClass(user.rank)
        )}
        variants={rankBadgeVariants}
      >
        {user.rank}
      </motion.div>

      {/* Avatar */}
      <motion.div
        className={cn(
          "relative h-10 w-10 rounded-full shrink-0 overflow-hidden",
          "ring-2",
          tierConfig.color.replace("text-", "ring-")
        )}
        variants={avatarVariants}
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </motion.div>

      {/* Name and Tier */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {isCurrentUser && <span className="text-[10px] text-primary font-medium">(You)</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{tierConfig.emoji}</span>
          <span className={tierConfig.color}>{tierConfig.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 shrink-0 text-xs">
        {/* Completed Count */}
        <div className="flex items-center gap-1 text-muted-foreground" title="Challenges completed">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium">{user.completedCount}</span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1 text-muted-foreground" title="Total XP earned">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-medium">{formatXp(user.totalXpEarned)}</span>
        </div>
      </div>
    </motion.button>
  );
}

export default LeaderboardRow;
