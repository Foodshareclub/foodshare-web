"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon } from "./icons";
import { getCurrentSeasonalPreset, type SeasonalPreset } from "@/lib/theme/themeConfig";
import { cn } from "@/lib/utils";

const currentSeasonalPreset = getCurrentSeasonalPreset();

interface SeasonalPresetCardProps {
  preset: SeasonalPreset;
  isActive: boolean;
  onClick: () => void;
}

export function SeasonalPresetCard({ preset, isActive, onClick }: SeasonalPresetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex flex-col p-3 rounded-xl border-2 transition-all text-left w-full overflow-hidden",
        isActive ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{ background: preset.gradient }}
        animate={
          isHovered
            ? {
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }
            : {}
        }
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles animation */}
      <AnimatePresence>
        {isHovered && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white/40"
                initial={{
                  x: `${(i * 20) % 100}%`,
                  y: "100%",
                  opacity: 0,
                }}
                animate={{
                  y: "-20%",
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1, 0.5],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2 + (i % 3) * 0.3,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Content overlay */}
      <div className="relative z-10 flex items-center gap-3">
        <motion.span
          className="text-3xl"
          animate={
            isHovered
              ? {
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{ duration: 0.5 }}
        >
          {preset.emoji}
        </motion.span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm block text-foreground">{preset.name}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{preset.description}</span>
        </div>
      </div>

      {/* Current season badge */}
      {currentSeasonalPreset?.id === preset.id && (
        <motion.div
          className="absolute top-1 right-1 px-2 py-0.5 bg-white/80 dark:bg-black/50 rounded-full text-[10px] font-medium"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          Current
        </motion.div>
      )}

      {/* Selection indicator */}
      {isActive && (
        <motion.div
          className="absolute bottom-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <CheckIcon />
        </motion.div>
      )}
    </motion.button>
  );
}
