"use client";

/**
 * SuccessAnimation Component
 * Uses pure CSS animations for optimal performance (no Framer Motion)
 */

import { useEffect, useState } from "react";
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
    particle: "bg-primary",
  },
  success: {
    circle: "stroke-green-500",
    icon: "text-green-500",
    bg: "bg-green-500/10",
    particle: "bg-green-500",
  },
  brand: {
    circle: "stroke-emerald-500",
    icon: "text-emerald-500",
    bg: "bg-emerald-500/10",
    particle: "bg-emerald-500",
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
  { x: -40, y: -40, rotate: -45, delay: 100 },
  { x: 40, y: -40, rotate: 45, delay: 150 },
  { x: -50, y: 0, rotate: -90, delay: 200 },
  { x: 50, y: 0, rotate: 90, delay: 250 },
  { x: -40, y: 40, rotate: -135, delay: 300 },
  { x: 40, y: 40, rotate: 135, delay: 350 },
  { x: 0, y: -50, rotate: 0, delay: 120 },
  { x: 0, y: 50, rotate: 180, delay: 280 },
];

/**
 * SuccessAnimation Component
 *
 * A reusable animated success indicator with multiple variants.
 * Perfect for form submissions, completed actions, and celebrations.
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
  const [isAnimating, setIsAnimating] = useState(false);
  const config = sizeConfig[size];
  const colors = themeColors[theme];
  const Icon = variantIcons[variant];

  useEffect(() => {
    if (show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing visibility state from show prop for animation
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // Wait for exit animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    if (show && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300);
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDuration, onComplete]);

  // SVG circle properties
  const radius = (config.circle - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay backdrop */}
      {overlay && (
        <div
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
            "transition-opacity duration-300",
            isAnimating ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
      )}

      {/* Main animation container */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4",
          "transition-all duration-300 ease-out",
          isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-[0.8]",
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
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "transition-transform duration-300 ease-out",
              colors.bg,
              isAnimating ? "scale-100" : "scale-0"
            )}
            style={{ transitionDelay: "100ms" }}
          />

          {/* Animated circle stroke */}
          <svg
            className="absolute inset-0 -rotate-90"
            width={config.circle}
            height={config.circle}
            viewBox={`0 0 ${config.circle} ${config.circle}`}
          >
            <circle
              cx={config.circle / 2}
              cy={config.circle / 2}
              r={radius}
              fill="none"
              strokeWidth={config.stroke}
              strokeLinecap="round"
              className={cn(colors.circle, "animate-success-circle")}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: isAnimating ? 0 : circumference,
                transition: "stroke-dashoffset 0.6s ease-out 0.2s",
              }}
            />
          </svg>

          {/* Icon */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "transition-all duration-300",
              colors.icon,
              isAnimating ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
            style={{
              transitionDelay: "400ms",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <Icon size={config.icon} strokeWidth={2.5} />
          </div>

          {/* Celebration particles */}
          {(variant === "celebration" || variant === "sparkle") && isAnimating && (
            <div className="absolute inset-0 pointer-events-none">
              {particles.map((particle, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-success-particle"
                  style={
                    {
                      "--particle-x": `${particle.x}px`,
                      "--particle-y": `${particle.y}px`,
                      animationDelay: `${particle.delay + 400}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className={cn("w-2 h-2 rounded-full", colors.particle)}
                    style={{ transform: `rotate(${particle.rotate}deg)` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message text */}
        {message && (
          <p
            className={cn(
              "font-semibold text-foreground text-center",
              "transition-all duration-300",
              config.message,
              isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
            )}
            style={{ transitionDelay: "500ms" }}
          >
            {message}
          </p>
        )}

        {/* Description text */}
        {description && (
          <p
            className={cn(
              "text-muted-foreground text-center max-w-xs",
              "transition-all duration-300",
              config.description,
              isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
            )}
            style={{ transitionDelay: "600ms" }}
          >
            {description}
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Inline success indicator for forms and inputs
 * Smaller, more subtle animation for inline use
 */
export function InlineSuccessIndicator({ show, className }: { show: boolean; className?: string }) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing visibility from show prop for animation
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-500",
        "transition-all duration-200",
        show ? "scale-100 opacity-100" : "scale-0 opacity-0",
        className
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      <Check size={12} strokeWidth={3} />
    </span>
  );
}
