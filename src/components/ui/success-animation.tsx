"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, PartyPopper, Sparkles, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuccessAnimationProps {
  /** Whether the animation is visible */
  show: boolean;
  /** Animation variant */
  variant?: "checkmark" | "celebration" | "sparkle" | "heart";
  /** Size of the animation */
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional message to display */
  message?: string;
  /** Optional subtitle/description */
  description?: string;
  /** Auto-hide after duration (ms). Set to 0 to disable */
  autoHideDuration?: number;
  /** Callback when animation completes or auto-hides */
  onComplete?: () => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to show background overlay */
  overlay?: boolean;
  /** Color theme */
  theme?: "primary" | "success" | "brand";
}

const sizeConfig = {
  sm: {
    container: "w-16 h-16",
    icon: 24,
    circle: 64,
    stroke: 3,
    message: "text-sm",
    description: "text-xs",
  },
  md: {
    container: "w-24 h-24",
    icon: 36,
    circle: 96,
    stroke: 4,
    message: "text-base",
    description: "text-sm",
  },
  lg: {
    container: "w-32 h-32",
    icon: 48,
    circle: 128,
    stroke: 5,
    message: "text-lg",
    description: "text-base",
  },
  xl: {
    container: "w-40 h-40",
    icon: 60,
    circle: 160,
    stroke: 6,
    message: "text-xl",
    description: "text-lg",
  },
};

const themeColors = {
  primary: {
    circle: "stroke-primary",
    icon: "text-primary",
    bg: "bg-primary/10",
  },
  success: {
    circle: "stroke-green-500",
    icon: "text-green-500",
    bg: "bg-green-500/10",
  },
  brand: {
    circle: "stroke-emerald-500",
    icon: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
};

const variantIcons = {
  checkmark: Check,
  celebration: PartyPopper,
  sparkle: Sparkles,
  heart: Heart,
};

// Particle positions for celebration effect
const particles = [
  { x: -40, y: -40, rotate: -45, delay: 0.1 },
  { x: 40, y: -40, rotate: 45, delay: 0.15 },
  { x: -50, y: 0, rotate: -90, delay: 0.2 },
  { x: 50, y: 0, rotate: 90, delay: 0.25 },
  { x: -40, y: 40, rotate: -135, delay: 0.3 },
  { x: 40, y: 40, rotate: 135, delay: 0.35 },
  { x: 0, y: -50, rotate: 0, delay: 0.12 },
  { x: 0, y: 50, rotate: 180, delay: 0.28 },
];

/**
 * SuccessAnimation Component
 *
 * A reusable animated success indicator with multiple variants.
 * Perfect for form submissions, completed actions, and celebrations.
 *
 * @example
 * // Basic checkmark
 * <SuccessAnimation show={isSuccess} message="Saved!" />
 *
 * @example
 * // Celebration with auto-hide
 * <SuccessAnimation
 *   show={showSuccess}
 *   variant="celebration"
 *   message="Congratulations!"
 *   description="Your listing was published"
 *   autoHideDuration={3000}
 *   onComplete={() => setShowSuccess(false)}
 * />
 *
 * @example
 * // With overlay for modal-like effect
 * <SuccessAnimation
 *   show={isComplete}
 *   variant="sparkle"
 *   size="lg"
 *   overlay
 *   theme="success"
 * />
 */
export function SuccessAnimation({
  show,
  variant = "checkmark",
  size = "md",
  message,
  description,
  autoHideDuration = 0,
  onComplete,
  className,
  overlay = false,
  theme = "success",
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(show);
  const config = sizeConfig[size];
  const colors = themeColors[theme];
  const Icon = variantIcons[variant];

  useEffect(() => {
    setIsVisible(show);

    if (show && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDuration, onComplete]);

  // SVG circle properties
  const radius = (config.circle - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay backdrop */}
          {overlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              aria-hidden="true"
            />
          )}

          {/* Main animation container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "flex flex-col items-center justify-center gap-4",
              overlay && "fixed inset-0 z-50",
              className
            )}
            role="status"
            aria-live="polite"
            aria-label={message || "Success"}
          >
            {/* Circle and icon container */}
            <div className={cn("relative", config.container)}>
              {/* Background circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  colors.bg
                )}
              />

              {/* Animated circle stroke */}
              <svg
                className="absolute inset-0 -rotate-90"
                width={config.circle}
                height={config.circle}
                viewBox={`0 0 ${config.circle} ${config.circle}`}
              >
                <motion.circle
                  cx={config.circle / 2}
                  cy={config.circle / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={config.stroke}
                  strokeLinecap="round"
                  className={colors.circle}
                  initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                />
              </svg>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.4,
                }}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  colors.icon
                )}
              >
                <Icon size={config.icon} strokeWidth={2.5} />
              </motion.div>

              {/* Celebration particles */}
              {(variant === "celebration" || variant === "sparkle") && (
                <div className="absolute inset-0 pointer-events-none">
                  {particles.map((particle, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: particle.x,
                        y: particle.y,
                      }}
                      transition={{
                        duration: 0.8,
                        delay: particle.delay + 0.4,
                        ease: "easeOut",
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: particle.rotate }}
                        className={cn("w-2 h-2 rounded-full", colors.bg.replace("/10", ""))}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Message text */}
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={cn("font-semibold text-foreground text-center", config.message)}
              >
                {message}
              </motion.p>
            )}

            {/* Description text */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={cn("text-muted-foreground text-center max-w-xs", config.description)}
              >
                {description}
              </motion.p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline success indicator for forms and inputs
 * Smaller, more subtle animation for inline use
 */
export function InlineSuccessIndicator({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-500",
            className
          )}
        >
          <Check size={12} strokeWidth={3} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
