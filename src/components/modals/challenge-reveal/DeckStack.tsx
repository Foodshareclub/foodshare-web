"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CardBack } from "./CardFace";
import { stackCardVariants, shuffleFlyVariants } from "./animations";
import { DECK_CONFIG } from "./constants";
import type { DeckStackProps } from "./types";

export function DeckStack({ challenges, isShuffling }: DeckStackProps) {
  // Only show up to VISIBLE_CARDS in the stack
  const visibleCards = challenges.slice(0, DECK_CONFIG.VISIBLE_CARDS);

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout">
        {visibleCards.map((challenge, index) => {
          // Reverse order so first card is on top visually but rendered last
          const stackIndex = visibleCards.length - 1 - index;

          return (
            <motion.div
              key={`stack-${challenge.id}-${index}`}
              className={cn(
                "absolute top-0 left-0",
                "pointer-events-none" // Stack cards are not interactive
              )}
              variants={isShuffling ? shuffleFlyVariants(stackIndex) : stackCardVariants(stackIndex)}
              initial="stacked"
              animate={isShuffling ? "fly" : "stacked"}
              exit="exit"
              style={{
                zIndex: 10 - stackIndex,
              }}
            >
              <CardBack />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default DeckStack;
