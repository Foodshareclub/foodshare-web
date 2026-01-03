"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ColorScheme = "teal" | "purple" | "emerald" | "sky" | "amber" | "rose" | "blue" | "orange";

interface PostDetailSectionProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  colorScheme?: ColorScheme;
  className?: string;
  /** Inline variant shows content next to title instead of below */
  variant?: "default" | "inline";
}

const iconColorSchemes: Record<ColorScheme, {
  bg: string;
  text: string;
}> = {
  teal: {
    bg: "from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/30",
    text: "text-teal-600 dark:text-teal-400",
  },
  purple: {
    bg: "from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  emerald: {
    bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    bg: "from-sky-50 to-cyan-50 dark:from-sky-950/50 dark:to-cyan-950/30",
    text: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    bg: "from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    bg: "from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/30",
    text: "text-rose-600 dark:text-rose-400",
  },
  blue: {
    bg: "from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  orange: {
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30",
    text: "text-orange-600 dark:text-orange-400",
  },
};

/**
 * PostDetailSection - Reusable section component for post details
 *
 * Displays information with a colored icon header.
 * Supports two variants:
 * - default: Title above, content below (for descriptions, long content)
 * - inline: Title and content side by side (for single values)
 */
export function PostDetailSection({
  icon: Icon,
  title,
  children,
  colorScheme = "teal",
  className,
  variant = "default",
}: PostDetailSectionProps) {
  const colors = iconColorSchemes[colorScheme];

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl",
          "bg-muted/30 hover:bg-muted/50 transition-colors",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-xl",
              `bg-gradient-to-br ${colors.bg}`
            )}
          >
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl",
            `bg-gradient-to-br ${colors.bg}`
          )}
        >
          <Icon className={cn("h-5 w-5", colors.text)} />
        </div>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <div className="text-muted-foreground leading-relaxed pl-13">
        {children}
      </div>
    </div>
  );
}

export default PostDetailSection;
