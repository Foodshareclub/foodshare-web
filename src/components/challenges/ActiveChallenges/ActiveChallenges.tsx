/**
 * Active Challenges Component
 *
 * Displays the user's active (uncompleted) challenges with option to mark complete.
 * Features GPU-optimized animations and confetti celebration on completion.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, Flame, Trophy, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveChallenges, useCompleteChallenge } from "@/hooks/queries/useActiveChallenges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 },
  },
};

const celebrationVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 15 },
  },
};

interface ActiveChallengesProps {
  className?: string;
}

export function ActiveChallenges({ className }: ActiveChallengesProps) {
  const shouldReduceMotion = useReducedMotion();
  const { data: challenges, isLoading } = useActiveChallenges();
  const { mutate: complete, isPending } = useCompleteChallenge();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [celebratingId, setCelebratingId] = useState<number | null>(null);

  const handleComplete = (challengeId: number) => {
    setConfirmingId(null);
    setCelebratingId(challengeId);

    // Play celebration animation, then complete
    setTimeout(() => {
      complete(challengeId, {
        onSuccess: () => {
          setTimeout(() => setCelebratingId(null), 1500);
        },
        onError: () => {
          setCelebratingId(null);
        },
      });
    }, 500);
  };

  const confirmingChallenge = challenges?.find((c) => c.challengeId === confirmingId);

  if (isLoading) {
    return <ActiveChallengesSkeleton />;
  }

  if (!challenges || challenges.length === 0) {
    return null; // Don't show section if no active challenges
  }

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
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Active Challenges</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {challenges.length}
            </span>
          </div>
        </div>

        {/* Challenge List */}
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {challenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                variants={shouldReduceMotion ? undefined : itemVariants}
                exit="exit"
                layout
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-lg",
                  "bg-muted/30 hover:bg-muted/50 transition-colors",
                  "group cursor-pointer",
                  celebratingId === challenge.challengeId && "bg-green-500/10"
                )}
              >
                {/* Celebration overlay */}
                <AnimatePresence>
                  {celebratingId === challenge.challengeId && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg z-10"
                      variants={celebrationVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                        <span className="font-semibold">Challenge Complete!</span>
                        <Trophy className="h-5 w-5 animate-bounce" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Challenge Image */}
                <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={challenge.image} alt="" className="h-full w-full object-cover" />
                  {/* Difficulty badge */}
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 px-1 py-0.5 text-[10px] font-bold rounded-tl",
                      challenge.difficulty === "Easy" && "bg-green-500 text-white",
                      challenge.difficulty === "Medium" && "bg-yellow-500 text-black",
                      challenge.difficulty === "Hard" && "bg-red-500 text-white"
                    )}
                  >
                    {challenge.difficulty[0]}
                  </div>
                </div>

                {/* Challenge Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{challenge.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {challenge.score} XP
                    </span>
                    <span>•</span>
                    <span>{new Date(challenge.acceptedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Complete Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
                    "border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-600",
                    "focus:opacity-100"
                  )}
                  onClick={() => setConfirmingId(challenge.challengeId)}
                  disabled={isPending || celebratingId === challenge.challengeId}
                >
                  {isPending && celebratingId === challenge.challengeId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Complete</span>
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmingId} onOpenChange={() => setConfirmingId(null)}>
        <DialogContent variant="glass" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Complete Challenge?
            </DialogTitle>
            <DialogDescription>
              Are you sure you&apos;ve completed &quot;{confirmingChallenge?.title}&quot;?
              You&apos;ll earn{" "}
              <strong className="text-primary">{confirmingChallenge?.score} XP</strong> and move up
              on the leaderboard!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmingId(null)}>
              Not Yet
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              onClick={() => confirmingId && handleComplete(confirmingId)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Yes, I Did It!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActiveChallengesSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-2 space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActiveChallenges;
