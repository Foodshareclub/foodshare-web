import React from "react";
import { cn } from "@/lib/utils";

interface FrequencyBadgeProps {
  count: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * FrequencyBadge - Displays a count with color-coded badge
 * Color provides semantic meaning for different count ranges
 */
export const FrequencyBadge: React.FC<FrequencyBadgeProps> = ({
  count,
  label = "items",
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "text-xs text-[0.75rem]",
    md: "text-sm text-[0.875rem]",
  };

  const getBadgeClass = (): string => {
    if (count === 0) return "bg-muted/20 text-muted";
    if (count < 5) return "bg-success/20 text-success";
    if (count < 20) return "bg-warning/20 text-warning";
    return "bg-primary/20 text-primary";
  };

  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-[0.7rem] font-medium",
        sizeMap[size],
        getBadgeClass(),
        className
      )}
    >
      {count} {label}
    </span>
  );
};
