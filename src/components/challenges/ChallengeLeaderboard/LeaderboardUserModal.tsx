/**
 * Leaderboard User Modal Component
 *
 * Modal displaying detailed user profile with stats and recent challenges.
 * Features glass morphism design and smooth animations.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Flame, Target, Trophy, Calendar } from "lucide-react";
import {
  modalContentVariants,
  modalStatsVariants,
  statItemVariants,
  tierBadgeVariants,
  challengeListVariants,
  challengeItemVariants,
} from "./animations";
import { getTierConfig, formatXp } from "./constants";
import type { LeaderboardUserModalProps } from "./types";
import { useLeaderboardUserProfile } from "@/hooks/queries/useChallengeLeaderboard";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LeaderboardUserModal({ userId, open, onOpenChange }: LeaderboardUserModalProps) {
  const { data: profile, isLoading } = useLeaderboardUserProfile(userId);

  const tierConfig = profile ? getTierConfig(profile.tier) : null;
  const displayName = profile?.nickname || profile?.firstName || "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-overlay">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <ModalSkeleton key="skeleton" />
          ) : profile ? (
            <motion.div
              key="content"
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DialogHeader className="text-center pb-4">
                {/* Avatar */}
                <div className="flex justify-center mb-3">
                  <motion.div
                    className={cn(
                      "relative h-20 w-20 rounded-full overflow-hidden",
                      "ring-4",
                      tierConfig?.color.replace("text-", "ring-")
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {profile.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-2xl font-medium">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Name */}
                <DialogTitle className="text-xl font-bold">{displayName}</DialogTitle>

                {/* Tier Badge */}
                {tierConfig && (
                  <motion.div
                    className="flex justify-center mt-2"
                    variants={tierBadgeVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                        "bg-gradient-to-r from-background/80 to-background/60",
                        "border border-border/50 backdrop-blur-sm",
                        tierConfig.color
                      )}
                    >
                      <span className="text-base">{tierConfig.emoji}</span>
                      <span>{tierConfig.label}</span>
                    </span>
                  </motion.div>
                )}
              </DialogHeader>

              {/* Stats Grid */}
              <motion.div
                className="grid grid-cols-2 gap-3 mb-4"
                variants={modalStatsVariants}
                initial="hidden"
                animate="visible"
              >
                <StatCard
                  icon={<Trophy className="h-4 w-4 text-amber-500" />}
                  label="Rank"
                  value={`#${profile.rank}`}
                />
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                  label="Completed"
                  value={profile.completedCount.toString()}
                />
                <StatCard
                  icon={<Target className="h-4 w-4 text-blue-500" />}
                  label="Active"
                  value={profile.activeCount.toString()}
                />
                <StatCard
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  label="Total XP"
                  value={formatXp(profile.totalXpEarned)}
                />
              </motion.div>

              {/* Completion Rate */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Completion Rate</span>
                  <span>{profile.completionRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${profile.completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Recent Challenges */}
              {profile.recentChallenges.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Recent Completions
                  </h4>
                  <motion.div
                    className="space-y-1.5"
                    variants={challengeListVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {profile.recentChallenges.map((challenge) => (
                      <motion.div
                        key={challenge.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs"
                        variants={challengeItemVariants}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{challenge.title}</p>
                          <p className="text-muted-foreground">
                            {formatDate(challenge.completedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <DifficultyBadge difficulty={challenge.difficulty} />
                          <span className="text-orange-500 font-medium">+{challenge.xp} XP</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      className="flex flex-col items-center p-3 rounded-lg bg-muted/50 backdrop-blur-sm"
      variants={statItemVariants}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </motion.div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-green-500/20 text-green-600",
    Medium: "bg-yellow-500/20 text-yellow-600",
    Hard: "bg-red-500/20 text-red-600",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium",
        colors[difficulty] || colors.Easy
      )}
    >
      {difficulty}
    </span>
  );
}

function ModalSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-center mb-4">
        <div className="h-20 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-6 w-32 mx-auto rounded bg-muted mb-2" />
      <div className="h-8 w-24 mx-auto rounded-full bg-muted mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default LeaderboardUserModal;
