"use client";

import { useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { CardFace } from "./CardFace";
import { CardOverlayIndicators } from "./SwipeIndicators";
import { snapBackSpring } from "./animations";
import { SWIPE_CONFIG } from "./constants";
import type { SwipeableCardProps } from "./types";

export function SwipeableCard({ challenge, onSwipeLeft, onSwipeRight, dragX }: SwipeableCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const controls = useAnimation();

  // Motion values for drag tracking
  const internalX = useMotionValue(0);
  const x = dragX || internalX;
  const y = useMotionValue(0);

  // Transform drag position to rotation
  const rotate = useTransform(
    x,
    [-SWIPE_CONFIG.EXIT_DISTANCE, 0, SWIPE_CONFIG.EXIT_DISTANCE],
    [-SWIPE_CONFIG.MAX_ROTATION, 0, SWIPE_CONFIG.MAX_ROTATION]
  );

  // Scale slightly during drag
  const scale = useTransform(
    x,
    [-SWIPE_CONFIG.EXIT_DISTANCE, 0, SWIPE_CONFIG.EXIT_DISTANCE],
    [0.95, 1, 0.95]
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipeDistance = offset.x;
      const swipeVelocity = velocity.x;

      // Check if swipe threshold is met (either by distance or velocity)
      const isSwipeRight =
        swipeDistance > SWIPE_CONFIG.THRESHOLD || swipeVelocity > SWIPE_CONFIG.VELOCITY_THRESHOLD;
      const isSwipeLeft =
        swipeDistance < -SWIPE_CONFIG.THRESHOLD || swipeVelocity < -SWIPE_CONFIG.VELOCITY_THRESHOLD;

      if (isSwipeRight) {
        // Notify parent immediately — AnimatePresence handles the exit animation
        onSwipeRight();
      } else if (isSwipeLeft) {
        // Notify parent immediately — AnimatePresence handles the exit animation
        onSwipeLeft();
      } else {
        // Snap back to center
        controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          transition: snapBackSpring,
        });
      }
    },
    [controls, onSwipeLeft, onSwipeRight]
  );

  // For reduced motion, just use button controls
  if (prefersReducedMotion) {
    return (
      <div className="relative z-10">
        <CardFace challenge={challenge} />
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "relative z-10 cursor-grab active:cursor-grabbing",
        "touch-none select-none" // Prevent text selection during drag
      )}
      style={{
        x,
        y,
        rotate,
        scale,
        // GPU acceleration
        willChange: "transform",
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={SWIPE_CONFIG.DRAG_ELASTIC}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* Swipe overlay indicators (SKIP/YES stamps) */}
      <CardOverlayIndicators dragX={x} />

      {/* The actual card */}
      <CardFace challenge={challenge} />
    </motion.div>
  );
}

export default SwipeableCard;
