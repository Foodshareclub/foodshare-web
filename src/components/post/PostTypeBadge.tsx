"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPostTypeConfig } from "@/lib/constants";

interface PostTypeBadgeProps {
  postType: string;
  /** Display variant */
  variant?: "gradient" | "subtle" | "outline";
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Additional class names */
  className?: string;
  /** Show emoji before label */
  showEmoji?: boolean;
}

/**
 * Gradient mappings for each post type
 * Used for the gradient variant to create visually distinct badges
 */
const GRADIENT_MAP: Record<string, string> = {
  orange: "from-orange-500 to-rose-500",
  blue: "from-blue-500 to-indigo-500",
  green: "from-green-500 to-emerald-500",
  purple: "from-purple-500 to-violet-500",
  cyan: "from-cyan-500 to-teal-500",
  amber: "from-amber-500 to-yellow-500",
  pink: "from-pink-500 to-rose-500",
  yellow: "from-yellow-500 to-amber-500",
  emerald: "from-emerald-500 to-green-500",
  teal: "from-teal-500 to-cyan-500",
  indigo: "from-indigo-500 to-purple-500",
  slate: "from-slate-500 to-gray-500",
  gray: "from-gray-500 to-slate-500",
};

/**
 * PostTypeBadge - Reusable badge component for displaying post types
 *
 * Supports three variants:
 * - gradient: Vibrant gradient background (for prominent displays)
 * - subtle: Light background with colored text (for lists)
 * - outline: Border with transparent background (for filters)
 */
export function PostTypeBadge({
  postType,
  variant = "gradient",
  size = "default",
  className,
  showEmoji = false,
}: PostTypeBadgeProps) {
  const config = getPostTypeConfig(postType);
  const gradient = GRADIENT_MAP[config.primaryColor] || GRADIENT_MAP.gray;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-4 py-1.5 text-sm",
    lg: "px-5 py-2 text-base",
  };

  if (variant === "gradient") {
    return (
      <Badge
        className={cn(
          "bg-gradient-to-r text-white border-0 font-medium capitalize shadow-md",
          gradient,
          sizeClasses[size],
          className
        )}
      >
        {showEmoji && <span className="mr-1.5">{config.emoji}</span>}
        {config.label}
      </Badge>
    );
  }

  if (variant === "subtle") {
    return (
      <Badge
        className={cn(
          config.color,
          "font-medium capitalize border-0",
          sizeClasses[size],
          className
        )}
      >
        {showEmoji && <span className="mr-1.5">{config.emoji}</span>}
        {config.label}
      </Badge>
    );
  }

  // outline variant
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium capitalize",
        config.bgActive,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showEmoji && <span className="mr-1.5">{config.emoji}</span>}
      {config.label}
    </Badge>
  );
}

export default PostTypeBadge;
