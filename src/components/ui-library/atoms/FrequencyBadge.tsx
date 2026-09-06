import React from "react";
import { cn } from "@/lib/utils";

interface FrequencyBadgeProps {
  count: number;
  label?: string;
  size?: "sm" | "md";
  variant?: "default" | "low" | "high";
  className?: string;
}

/**
 * FrequencyBadge - Displays a count with color-coded badge
 * Color variants provide semantic meaning for different count ranges
 */
export const FrequencyBadge: React.FC<FrequencyBadgeProps> = ({
  count,
  label = "items",
  size = "md",
  variant = "default",
  className,
}) => {
  const sizeMap = {
    sm: "text-xs text-[0.75rem]",
    md: "text-sm text-[0.875rem]",
  };

  const variantMap = {
    default: "bg-muted/20 text-muted",
    low: "bg-success/20 text-success",
    high: "bg-primary/20 text-primary",
  };

  const getBadgeClass = (): string => {
    if (count === 0) return variantMap["default"];
    if (count < 5) return variantMap["low"];
    if (count < 20) return variantMap["high"];
    return variantMap["default"];
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
