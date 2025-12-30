/**
 * Challenge Leaderboard Component
 *
 * Displays top challenge completers with animated rows and user modal.
 * Features GPU-optimized animations, accessibility support, and current user rank.
 */

"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";
import { containerVariants, currentUserVariants, pulseVariants } from "./animations";
import { getTierConfig, formatXp, LEADERBOARD_LIMIT } from "./constants";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardUserModal } from "./LeaderboardUserModal";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";
import type { ChallengeLeaderboardProps, UserRankInfo } from "./types";
import {
  useChallengeLeaderboard,
  useCurrentUserRank,
} from "@/hooks/queries/useChallengeLeaderboard";
import { useLeaderboardRealtime } from "@/hooks/queries/useLeaderboardRealtime";
import { cn } from "@/lib/utils";

export function ChallengeLeaderboard({
  initialData,
  currentUserRank: initialUserRank,
  className,
}: ChallengeLeaderboardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Enable realtime updates for live leaderboard
  useLeaderboardRealtime();

  const { data: leaderboard, isLoading } = useChallengeLeaderboard(initialData);
  const { data: currentUserRank } = useCurrentUserRank(initialUserRank);

  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  if (isLoading && !initialData) {
    return <LeaderboardSkeleton rows={5} />;
  }

  const users = leaderboard || [];
  const showCurrentUserSection =
    currentUserRank && !currentUserRank.isInTopTen && currentUserRank.completedCount > 0;

  return (
    <>
      <motion.div
        className={cn(
          "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden",
          className
        )}
        variants={shouldReduceMotion ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-sm">Challenge Champions</h3>
          </div>
          {users.length > LEADERBOARD_LIMIT && (
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
              View All
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Leaderboard List */}
        <div className="p-2">
          {users.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              className="space-y-1"
              variants={shouldReduceMotion ? undefined : containerVariants}
            >
              {users.slice(0, LEADERBOARD_LIMIT).map((user) => (
                <LeaderboardRow
                  key={user.id}
                  user={user}
                  isCurrentUser={currentUserRank?.id === user.id}
                  onClick={() => handleRowClick(user.id)}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Current User Rank (if not in top 10) */}
        {showCurrentUserSection && (
          <CurrentUserRankSection
            userRank={currentUserRank}
            onClick={() => handleRowClick(currentUserRank.id)}
            shouldReduceMotion={shouldReduceMotion}
          />
        )}
      </motion.div>

      {/* User Profile Modal */}
      <LeaderboardUserModal userId={selectedUserId} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <Trophy className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No champions yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Be the first to complete a challenge!</p>
    </div>
  );
}

function CurrentUserRankSection({
  userRank,
  onClick,
  shouldReduceMotion,
}: {
  userRank: UserRankInfo;
  onClick: () => void;
  shouldReduceMotion: boolean | null;
}) {
  const tierConfig = getTierConfig(userRank.tier);

  return (
    <motion.div
      className="border-t border-border/50 p-2"
      variants={shouldReduceMotion ? undefined : currentUserVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.button
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg",
          "bg-primary/5 border border-primary/20",
          "hover:bg-primary/10 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
        onClick={onClick}
        variants={shouldReduceMotion ? undefined : pulseVariants}
        initial="initial"
        animate="animate"
      >
        {/* Rank */}
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
          {userRank.rank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm">Your Rank</span>
            <span className="text-xs text-primary">{tierConfig.emoji}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {userRank.completedCount} completed • {formatXp(userRank.totalXp)} XP
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </motion.button>
    </motion.div>
  );
}

export default ChallengeLeaderboard;
