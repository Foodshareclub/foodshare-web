"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SWIPE_CONFIG } from "./constants";

interface SwipeIndicatorsProps {
  dragX: MotionValue<number>;
}

export function SwipeIndicators({ dragX }: SwipeIndicatorsProps) {
  // Transform drag position to indicator opacity
  const leftOpacity = useTransform(dragX, [-SWIPE_CONFIG.THRESHOLD, 0], [1, 0]);
  const rightOpacity = useTransform(dragX, [0, SWIPE_CONFIG.THRESHOLD], [0, 1]);

  // Scale based on drag distance
  const leftScale = useTransform(dragX, [-SWIPE_CONFIG.THRESHOLD, 0], [1.2, 0.8]);
  const rightScale = useTransform(dragX, [0, SWIPE_CONFIG.THRESHOLD], [0.8, 1.2]);

  return (
    <>
      {/* Skip indicator (left) */}
      <motion.div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-red-500/90 backdrop-blur-sm",
          "border-2 border-red-400",
          "shadow-lg shadow-red-500/30"
        )}
        style={{
          opacity: leftOpacity,
          scale: leftScale,
        }}
      >
        <X className="w-7 h-7 text-white" strokeWidth={3} />
      </motion.div>

      {/* Accept indicator (right) */}
      <motion.div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-16",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-green-500/90 backdrop-blur-sm",
          "border-2 border-green-400",
          "shadow-lg shadow-green-500/30"
        )}
        style={{
          opacity: rightOpacity,
          scale: rightScale,
        }}
      >
        <Heart className="w-7 h-7 text-white fill-white" />
      </motion.div>
    </>
  );
}

// Overlay indicators that appear on the card itself
export function CardOverlayIndicators({ dragX }: SwipeIndicatorsProps) {
  const leftOpacity = useTransform(dragX, [-SWIPE_CONFIG.THRESHOLD * 0.7, 0], [1, 0]);
  const rightOpacity = useTransform(dragX, [0, SWIPE_CONFIG.THRESHOLD * 0.7], [0, 1]);

  return (
    <>
      {/* SKIP stamp overlay */}
      <motion.div
        className={cn(
          "absolute top-8 left-4 z-20",
          "px-4 py-2 rounded-lg",
          "border-4 border-red-500",
          "bg-red-500/10 backdrop-blur-sm",
          "-rotate-12"
        )}
        style={{ opacity: leftOpacity }}
      >
        <span className="text-2xl font-black text-red-500 tracking-wider">SKIP</span>
      </motion.div>

      {/* ACCEPT stamp overlay */}
      <motion.div
        className={cn(
          "absolute top-8 right-4 z-20",
          "px-4 py-2 rounded-lg",
          "border-4 border-green-500",
          "bg-green-500/10 backdrop-blur-sm",
          "rotate-12"
        )}
        style={{ opacity: rightOpacity }}
      >
        <span className="text-2xl font-black text-green-500 tracking-wider">YES!</span>
      </motion.div>
    </>
  );
}

export default SwipeIndicators;
