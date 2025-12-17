"use client";

import { useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Sparkles } from "lucide-react";
import { CardDeck } from "./CardDeck";
import { modalVariants } from "./animations";
import type { ChallengeRevealModalProps } from "./types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { acceptChallenge } from "@/app/actions/challenges";

export function ChallengeRevealModal({
  open,
  onOpenChange,
  challenges,
  activeChallenge,
  onAccept,
}: ChallengeRevealModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleAcceptChallenge = useCallback(
    (challengeId: number) => {
      startTransition(async () => {
        try {
          await acceptChallenge(challengeId);
          onAccept?.(challengeId);
        } catch (error) {
          console.error("Failed to accept challenge:", error);
        }
      });
    },
    [onAccept]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (challenges.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="glass"
        className={cn(
          "max-w-md w-full p-0 overflow-hidden",
          "bg-background/80 backdrop-blur-2xl",
          "border border-border/50",
          "shadow-2xl"
        )}
      >
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative"
            >
              {/* Decorative background elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
              </div>

              {/* Header */}
              <DialogHeader className="relative px-6 pt-6 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-500/20 border border-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      Discover Challenges
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Swipe right to accept, left to skip
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Card Deck */}
              <div className="relative px-6 py-6">
                <CardDeck
                  key={activeChallenge?.id ?? "default"}
                  challenges={challenges}
                  activeChallenge={activeChallenge}
                  onAccept={handleAcceptChallenge}
                  onComplete={handleClose}
                />

                {/* Loading overlay */}
                {isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Shuffle className="w-4 h-4" />
                      </motion.div>
                      <span>Accepting challenge...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-6 pb-4 text-center">
                <p className="text-xs text-muted-foreground/60">
                  Tip: Use arrow keys or drag to swipe through challenges
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default ChallengeRevealModal;
