"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ColorScheme = "rose" | "blue" | "amber" | "emerald" | "purple" | "teal" | "orange" | "cyan";

interface PostStatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  colorScheme: ColorScheme;
  className?: string;
}

const colorSchemes: Record<ColorScheme, {
  bg: string;
  hover: string;
  icon: string;
  value: string;
  label: string;
}> = {
  rose: {
    bg: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20",
    hover: "from-rose-500/10",
    icon: "text-rose-500",
    value: "text-rose-600 dark:text-rose-400",
    label: "text-rose-600/70 dark:text-rose-400/70",
  },
  blue: {
    bg: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20",
    hover: "from-blue-500/10",
    icon: "text-blue-500",
    value: "text-blue-600 dark:text-blue-400",
    label: "text-blue-600/70 dark:text-blue-400/70",
  },
  amber: {
    bg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    hover: "from-amber-500/10",
    icon: "text-amber-500",
    value: "text-amber-600 dark:text-amber-400",
    label: "text-amber-600/70 dark:text-amber-400/70",
  },
  emerald: {
    bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20",
    hover: "from-emerald-500/10",
    icon: "text-emerald-500",
    value: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-600/70 dark:text-emerald-400/70",
  },
  purple: {
    bg: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20",
    hover: "from-purple-500/10",
    icon: "text-purple-500",
    value: "text-purple-600 dark:text-purple-400",
    label: "text-purple-600/70 dark:text-purple-400/70",
  },
  teal: {
    bg: "from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20",
    hover: "from-teal-500/10",
    icon: "text-teal-500",
    value: "text-teal-600 dark:text-teal-400",
    label: "text-teal-600/70 dark:text-teal-400/70",
  },
  orange: {
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20",
    hover: "from-orange-500/10",
    icon: "text-orange-500",
    value: "text-orange-600 dark:text-orange-400",
    label: "text-orange-600/70 dark:text-orange-400/70",
  },
  cyan: {
    bg: "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/20",
    hover: "from-cyan-500/10",
    icon: "text-cyan-500",
    value: "text-cyan-600 dark:text-cyan-400",
    label: "text-cyan-600/70 dark:text-cyan-400/70",
  },
};

/**
 * PostStatsCard - Displays a single stat in a colorful, interactive card
 *
 * Used in post detail pages to show likes, views, posted date, etc.
 * Features gradient backgrounds, hover effects, and consistent dark mode support.
 */
export function PostStatsCard({
  icon: Icon,
  value,
  label,
  colorScheme,
  className,
}: PostStatsCardProps) {
  const colors = colorSchemes[colorScheme];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl p-4 text-center",
        "transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default",
        `bg-gradient-to-br ${colors.bg}`,
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br to-transparent opacity-0",
          "group-hover:opacity-100 transition-opacity",
          colors.hover
        )}
      />
      <div className="relative">
        <Icon className={cn("h-5 w-5 mx-auto mb-1", colors.icon)} />
        <div className={cn("text-lg font-bold tabular-nums", colors.value)}>
          {value}
        </div>
        <div className={cn("text-xs", colors.label)}>{label}</div>
      </div>
    </div>
  );
}

export default PostStatsCard;
