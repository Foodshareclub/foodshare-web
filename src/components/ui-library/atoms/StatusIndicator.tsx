import React from "react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "offline" | "pending" | "error";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * StatusIndicator - Displays a status dot with color coding
 * Shows online/offline/pending/error status with appropriate colors
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const statusColor = {
    online: "bg-success text-success-foreground",
    offline: "bg-muted text-muted-foreground",
    pending: "bg-warning text-warning-foreground",
    error: "bg-error text-error-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        sizeMap[size],
        statusColor[status],
        className
      )}
    />
  );
};
