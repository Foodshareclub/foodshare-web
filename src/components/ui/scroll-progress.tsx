"use client";

import { useEffect, useState, useRef, RefObject } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollProgressProps {
  /** Position of the progress bar */
  position?: "top" | "bottom";
  /** Height/thickness of the progress bar */
  height?: number;
  /** Color of the progress bar (CSS color or Tailwind class) */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Whether to show percentage label */
  showPercentage?: boolean;
  /** Whether to use spring animation for smoother movement */
  smooth?: boolean;
  /** Z-index for the progress bar */
  zIndex?: number;
  /** Additional CSS classes */
  className?: string;
  /** Container ref to track (defaults to window/document) */
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * ScrollProgress Component
 *
 * A horizontal progress bar that indicates scroll position on the page.
 * Fixed at the top or bottom of the viewport.
 *
 * @example
 * // Basic usage - add to layout
 * <ScrollProgress />
 *
 * @example
 * // Custom styling
 * <ScrollProgress
 *   position="top"
 *   height={3}
 *   color="bg-primary"
 *   smooth
 * />
 *
 * @example
 * // Track specific container
 * const containerRef = useRef<HTMLDivElement>(null);
 * <div ref={containerRef} className="overflow-auto h-96">
 *   <ScrollProgress containerRef={containerRef} />
 *   ...content
 * </div>
 */
export function ScrollProgress({
  position = "top",
  height = 3,
  color = "bg-primary",
  backgroundColor = "bg-transparent",
  showPercentage = false,
  smooth = true,
  zIndex = 50,
  className,
  containerRef,
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  // Apply spring animation for smoother movement
  const scaleX = smooth
    ? useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
    : scrollYProgress;

  // Transform for percentage display
  const percentage = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    if (showPercentage) {
      const unsubscribe = percentage.on("change", (v) => {
        setDisplayPercentage(Math.round(v));
      });
      return unsubscribe;
    }
  }, [percentage, showPercentage]);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 pointer-events-none",
        position === "top" ? "top-0" : "bottom-0",
        backgroundColor,
        className
      )}
      style={{ zIndex, height }}
      role="progressbar"
      aria-valuenow={displayPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <motion.div
        className={cn("h-full origin-left", color)}
        style={{ scaleX }}
      />

      {showPercentage && (
        <div
          className={cn(
            "absolute right-2 text-xs font-medium pointer-events-auto",
            position === "top" ? "top-full mt-1" : "bottom-full mb-1",
            "bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-foreground"
          )}
        >
          {displayPercentage}%
        </div>
      )}
    </div>
  );
}

export interface CircularScrollProgressProps {
  /** Size of the circular indicator */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color of the progress arc */
  color?: string;
  /** Background circle color */
  backgroundColor?: string;
  /** Whether to show percentage in center */
  showPercentage?: boolean;
  /** Position on screen */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Offset from edge */
  offset?: number;
  /** Whether to hide when at top (0%) */
  hideAtTop?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Container ref to track */
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * CircularScrollProgress Component
 *
 * A circular progress indicator that shows scroll position.
 * Fixed in a corner of the viewport.
 *
 * @example
 * // Basic usage
 * <CircularScrollProgress />
 *
 * @example
 * // Custom position and styling
 * <CircularScrollProgress
 *   position="bottom-left"
 *   size={48}
 *   showPercentage
 *   hideAtTop
 * />
 */
export function CircularScrollProgress({
  size = 44,
  strokeWidth = 3,
  color = "stroke-primary",
  backgroundColor = "stroke-muted",
  showPercentage = false,
  position = "bottom-right",
  offset = 20,
  hideAtTop = true,
  className,
  containerRef,
}: CircularScrollProgressProps) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(!hideAtTop);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setProgress(Math.round(v * 100));
      if (hideAtTop) {
        setIsVisible(v > 0.02);
      }
    });
    return unsubscribe;
  }, [scrollYProgress, hideAtTop]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const positionClasses = {
    "bottom-right": "bottom-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "top-right": "top-0 right-0",
    "top-left": "top-0 left-0",
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "fixed z-50",
        positionClasses[position],
        className
      )}
      style={{
        margin: offset,
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div className="relative glass rounded-full p-1.5 shadow-lg">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={backgroundColor}
          />

          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={color}
            style={{
              pathLength,
              strokeDasharray: circumference,
              strokeDashoffset: 0,
            }}
          />
        </svg>

        {/* Percentage text */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground">
              {progress}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * useScrollProgress Hook
 *
 * Custom hook for building custom scroll progress indicators.
 * Returns the current scroll progress as a value between 0 and 1.
 *
 * @example
 * const { progress, percentage } = useScrollProgress();
 * // progress: 0.5 (MotionValue)
 * // percentage: 50 (number)
 */
export function useScrollProgress(containerRef?: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
  });

  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setPercentage(Math.round(v * 100));
    });
    return unsubscribe;
  }, [scrollYProgress]);

  return {
    progress: smoothProgress,
    rawProgress: scrollYProgress,
    percentage,
  };
}

export default ScrollProgress;
