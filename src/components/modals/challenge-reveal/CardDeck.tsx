"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwipeableCard } from "./SwipeableCard";
import { DeckStack } from "./DeckStack";
import { SwipeIndicators } from "./SwipeIndicators";
import { ActionButtons, KeyboardHints } from "./ActionButtons";
import { CardBack } from "./CardFace";
import { shuffleVariants, emptyStateVariants, nextCardVariants } from "./animations";
import { DECK_CONFIG, ANIMATION_DURATIONS } from "./constants";
import type { CardDeckProps, ChallengeItem } from "./types";
import { useMotionValue } from "framer-motion";

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function CardDeck({ challenges: initialChallenges, onAccept, onComplete }: CardDeckProps) {
  const prefersReducedMotion = useReducedMotion();
  const [challenges, setChallenges] = useState<ChallengeItem[]>(() =>
    shuffleArray(initialChallenges)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  // For swipe indicators when using buttons
  const dragX = useMotionValue(0);

  const currentChallenge = challenges[currentIndex];
  const nextChallenges = challenges.slice(currentIndex + 1, currentIndex + 1 + DECK_CONFIG.VISIBLE_CARDS);
  const remainingCount = challenges.length - currentIndex;
  const isEmpty = currentIndex >= challenges.length;

  // Handle skip (swipe left)
  const handleSkip = useCallback(() => {
    if (isEmpty || isShuffling) return;
    setExitDirection("left");

    // Brief delay to show animation, then advance
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
    }, 50);
  }, [isEmpty, isShuffling]);

  // Handle accept (swipe right)
  const handleAccept = useCallback(() => {
    if (isEmpty || isShuffling) return;
    setExitDirection("right");

    // Call the accept callback
    if (onAccept && currentChallenge) {
      onAccept(currentChallenge.id);
    }

    // Brief delay to show animation, then advance
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
    }, 50);
  }, [isEmpty, isShuffling, onAccept, currentChallenge]);

  // Handle shuffle
  const handleShuffle = useCallback(() => {
    if (isShuffling) return;

    setIsShuffling(true);

    // After shuffle animation, reshuffle and reset
    setTimeout(() => {
      setChallenges(shuffleArray(initialChallenges));
      setCurrentIndex(0);
      setIsShuffling(false);
    }, ANIMATION_DURATIONS.SHUFFLE);
  }, [isShuffling, initialChallenges]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEmpty && e.key !== "Escape") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleSkip();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleAccept();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleShuffle();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip, handleAccept, handleShuffle, isEmpty]);

  // Notify when deck is exhausted
  useEffect(() => {
    if (isEmpty && onComplete) {
      onComplete();
    }
  }, [isEmpty, onComplete]);

  // Empty state
  if (isEmpty) {
    return (
      <motion.div
        variants={emptyStateVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-12 px-6 text-center"
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-teal-500/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2">
          All Caught Up!
        </h3>
        <p className="text-muted-foreground mb-6 max-w-xs">
          You&apos;ve seen all the challenges. Shuffle the deck to go through them again!
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShuffle}
          disabled={isShuffling}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full",
            "bg-gradient-to-r from-primary to-teal-500",
            "text-white font-semibold",
            "shadow-lg shadow-primary/30",
            "hover:shadow-xl hover:shadow-primary/40",
            "transition-shadow duration-200",
            isShuffling && "opacity-70 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-5 h-5", isShuffling && "animate-spin")} />
          Shuffle Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Remaining count */}
      <div className="mb-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{remainingCount}</span> challenges remaining
      </div>

      {/* Card stack area */}
      <motion.div
        className="relative"
        variants={shuffleVariants}
        initial="initial"
        animate={isShuffling ? "shuffle" : "initial"}
      >
        {/* Background deck stack */}
        <DeckStack challenges={nextChallenges} isShuffling={isShuffling} />

        {/* Swipe indicators (shown on sides) */}
        <SwipeIndicators dragX={dragX} />

        {/* Current card */}
        <AnimatePresence mode="wait">
          {currentChallenge && !isShuffling && (
            <motion.div
              key={currentChallenge.id}
              variants={nextCardVariants}
              initial="hidden"
              animate="visible"
              exit={exitDirection === "left" ? "exitLeft" : "exitRight"}
            >
              <SwipeableCard
                challenge={currentChallenge}
                onSwipeLeft={handleSkip}
                onSwipeRight={handleAccept}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show card back during shuffle */}
        {isShuffling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CardBack />
          </motion.div>
        )}
      </motion.div>

      {/* Action buttons */}
      <ActionButtons
        onSkip={handleSkip}
        onAccept={handleAccept}
        onShuffle={handleShuffle}
        disabled={isShuffling}
        showShuffle={!prefersReducedMotion}
      />

      {/* Keyboard hints */}
      <KeyboardHints />
    </div>
  );
}

export default CardDeck;
