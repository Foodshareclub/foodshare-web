import React from "react";
import { cn } from "@/lib/utils";
import { StatusIndicator } from "@/components/ui-library/atoms/StatusIndicator";

/**
 * StatusBadge - A composed molecule showing status with badge pattern
 * Combines StatusIndicator with text label for clear status communication
 */
interface StatusBadgeProps {
  status: "online" | "offline" | "pending" | "error";
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatusIndicator status={status} size={size} />
      <span className={cn("font-medium text-foreground", size === "sm" && "text-xs")}>{label}</span>
    </div>
  );
};
