"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Shuffle, Sparkles, Wand2 } from "lucide-react";
import { HeroDeckCard } from "./HeroDeckCard";
import {
  heroEntryVariants,
  stackCardVariants,
  shuffleDeckVariants,
  shuffleFlyVariants,
  hoverFloatVariants,
  shuffleButtonVariants,
  idleWobbleVariants,
  particleBurstVariants,
  glowPulseVariants,
} from "./animations";
import { HERO_DECK_CONFIG, ANIMATION_DURATIONS } from "./constants";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";

interface ChallengeDeckProps {
  challenges: InitialProductStateType[];
  onCardClick?: () => void;
  autoShuffle?: boolean;
  className?: string;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate particle positions for burst effect
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    size: 4 + Math.random() * 6,
    color: ["bg-primary", "bg-teal-400", "bg-orange-400", "bg-yellow-400", "bg-pink-400"][i % 5],
  }));
}

// Sparkle positions for magical effect - more positions
const SPARKLE_POSITIONS = [
  { top: "-8px", right: "-8px", size: "w-6 h-6", color: "text-yellow-400", delay: 0 },
  { top: "-12px", left: "-28px", size: "w-5 h-5", color: "text-primary", delay: 0.1 },
  { bottom: "35%", right: "-36px", size: "w-4 h-4", color: "text-teal-400", delay: 0.2 },
  { bottom: "55%", left: "-32px", size: "w-5 h-5", color: "text-orange-400", delay: 0.15 },
  { top: "15%", right: "-24px", size: "w-4 h-4", color: "text-pink-400", delay: 0.25 },
  { top: "40%", left: "-20px", size: "w-3 h-3", color: "text-yellow-300", delay: 0.3 },
  { bottom: "20%", right: "-16px", size: "w-3 h-3", color: "text-cyan-400", delay: 0.35 },
];

export function ChallengeDeck({
  challenges: initialChallenges,
  onCardClick,
  autoShuffle = true,
  className,
}: ChallengeDeckProps) {
  const prefersReducedMotion = useReducedMotion();
  const [challenges, setChallenges] = useState(() => shuffleArray(initialChallenges.slice(0, 12)));
  const [isShuffling, setIsShuffling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAutoShuffled, setHasAutoShuffled] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Memoize particles for performance
  const particles = useMemo(() => generateParticles(HERO_DECK_CONFIG.PARTICLE_COUNT), []);

  // Handle shuffle animation
  const handleShuffle = useCallback(() => {
    if (isShuffling || challenges.length === 0) return;

    setIsShuffling(true);
    setShowParticles(true);

    // Hide particles after burst
    setTimeout(() => {
      setShowParticles(false);
    }, 600);

    // After shuffle animation completes, update the cards
    setTimeout(() => {
      setChallenges((prev) => shuffleArray(prev));
      setIsShuffling(false);
    }, ANIMATION_DURATIONS.SHUFFLE);
  }, [isShuffling, challenges.length]);

  // Auto-shuffle on mount (subtle entrance effect)
  useEffect(() => {
    if (!autoShuffle || prefersReducedMotion || hasAutoShuffled) return;

    const timer = setTimeout(() => {
      handleShuffle();
      setHasAutoShuffled(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, [autoShuffle, prefersReducedMotion, hasAutoShuffled, handleShuffle]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCardClick?.();
      } else if (e.key === "s" || e.key === "S") {
        handleShuffle();
      }
    },
    [onCardClick, handleShuffle]
  );

  if (challenges.length === 0) {
    return null;
  }

  const visibleCards = challenges.slice(0, HERO_DECK_CONFIG.VISIBLE_CARDS);
  const topCard = visibleCards[0];

  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: `${HERO_DECK_CONFIG.PERSPECTIVE}px` }}
    >
      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        {isShuffling && "Shuffling challenges..."}
        {!isShuffling && topCard && `Showing: ${topCard.post_name}`}
      </div>

      {/* Ambient glow behind deck - GPU composite layer */}
      <motion.div
        variants={prefersReducedMotion ? undefined : glowPulseVariants}
        animate="idle"
        className="absolute -inset-16 rounded-[4rem] bg-gradient-conic from-primary/30 via-teal-500/20 via-50% to-orange-500/30 blur-3xl opacity-60 -z-10 gpu-glow gpu-isolated"
      />

      {/* Secondary rotating glow - GPU rotation layer */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }
        }
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -inset-12 rounded-full bg-gradient-to-r from-primary/20 via-transparent to-teal-500/20 blur-2xl -z-10 gpu-rotate gpu-blur"
      />

      {/* Main deck container - GPU 3D container */}
      <motion.div
        variants={prefersReducedMotion ? undefined : heroEntryVariants}
        initial="hidden"
        animate="visible"
        className="relative deck-container gpu-3d-container"
      >
        {/* Particle burst on shuffle */}
        <AnimatePresence>
          {showParticles && !prefersReducedMotion && (
            <>
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  variants={particleBurstVariants(particle.angle, particle.distance)}
                  initial="initial"
                  animate="burst"
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-30 gpu-particles",
                    particle.color
                  )}
                  style={{
                    width: particle.size,
                    height: particle.size,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Deck with cards - GPU composite layer */}
        <motion.div
          variants={prefersReducedMotion ? undefined : shuffleDeckVariants}
          animate={isShuffling ? "shuffle" : "idle"}
          className="relative cursor-pointer gpu-composite gpu-animate"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onCardClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Challenge: ${topCard?.post_name}. Press Enter to explore, S to shuffle.`}
        >
          {/* Subtle idle wobble wrapper */}
          <motion.div
            variants={prefersReducedMotion ? undefined : idleWobbleVariants}
            animate={!isShuffling && !isHovered ? "idle" : undefined}
            className="relative"
          >
            {/* Top face-up card - rendered first to establish position */}
            <motion.div
              variants={prefersReducedMotion ? undefined : hoverFloatVariants}
              animate={isHovered && !isShuffling ? "hover" : "idle"}
              className="relative z-20 gpu-3d-child"
            >
              <HeroDeckCard challenge={topCard} isFaceUp={true} className="group" isLarge />

              {/* Hover glow effect - GPU optimized */}
              <motion.div
                animate={{
                  opacity: isHovered ? 1 : 0,
                  scale: isHovered ? 1 : 0.95,
                }}
                transition={{ duration: 0.3 }}
                className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/30 via-teal-500/25 to-orange-500/30 blur-xl -z-10 gpu-glow"
              />
            </motion.div>

            {/* Background stacked cards (rendered after, positioned behind with lower z-index) */}
            <AnimatePresence mode="popLayout">
              {visibleCards.slice(1).map((challenge, idx) => {
                const index = idx + 1;
                return (
                  <motion.div
                    key={`bg-${challenge.id}`}
                    className="absolute top-0 left-0 card-stack-item"
                    variants={
                      prefersReducedMotion
                        ? undefined
                        : isShuffling
                          ? shuffleFlyVariants(index)
                          : stackCardVariants(index)
                    }
                    initial="idle"
                    animate={isShuffling ? "fly" : "stacked"}
                    style={{
                      zIndex: 10 - index,
                    }}
                  >
                    <HeroDeckCard challenge={challenge} isFaceUp={false} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Enhanced shuffle button with gradient border and glow */}
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring" }}
        >
          <div className="relative">
            {/* Animated glow behind button */}
            <motion.div
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-2 bg-gradient-to-r from-primary via-teal-500 to-orange-500 rounded-full blur-lg opacity-50"
            />
            <div className="relative p-[2px] rounded-full bg-gradient-to-r from-primary via-teal-500 to-orange-500">
              <motion.button
                variants={shuffleButtonVariants}
                initial="idle"
                animate={isShuffling ? "spinning" : "idle"}
                whileHover="hover"
                whileTap="tap"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShuffle();
                }}
                disabled={isShuffling}
                className={cn(
                  "flex items-center gap-2.5 px-6 py-3 rounded-full",
                  "bg-card/95 backdrop-blur-xl",
                  "shadow-2xl shadow-black/20",
                  "text-sm font-semibold text-foreground",
                  "hover:bg-card/80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
                aria-label="Shuffle challenges"
              >
                <motion.div
                  animate={isShuffling ? { rotate: 720 } : { rotate: 0 }}
                  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {isShuffling ? (
                    <Wand2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Shuffle className="w-5 h-5" />
                  )}
                </motion.div>
                <span>{isShuffling ? "Magic!" : "Shuffle"}</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Multiple decorative sparkles on hover */}
        <AnimatePresence>
          {isHovered && !prefersReducedMotion && (
            <>
              {SPARKLE_POSITIONS.map((pos, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, rotate: -30 }}
                  animate={{
                    opacity: [0.6, 1, 0.6],
                    scale: [0.8, 1.3, 0.8],
                    rotate: [0, 20, -20, 0],
                  }}
                  exit={{ opacity: 0, scale: 0, rotate: 30 }}
                  transition={{
                    delay: pos.delay,
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={cn("absolute pointer-events-none", pos.color)}
                  style={{
                    top: pos.top,
                    right: pos.right,
                    bottom: pos.bottom,
                    left: pos.left,
                    filter: "drop-shadow(0 0 4px currentColor)",
                  }}
                >
                  <Sparkles className={pos.size} />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Idle pulsing glow effect - GPU optimized */}
        {!isHovered && !prefersReducedMotion && (
          <motion.div
            className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-primary/15 via-teal-500/15 to-orange-500/15 blur-2xl -z-10 gpu-glow gpu-scale"
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Interactive hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-2 text-sm text-muted-foreground/70"
          >
            <Sparkles className="w-4 h-4 text-primary/60" />
            <span>Tap the deck to explore</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ChallengeDeck;
