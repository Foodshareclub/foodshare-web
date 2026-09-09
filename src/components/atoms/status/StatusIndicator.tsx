import * as React from "react";
import { cn } from "@/lib/cn";

import { cva, type VariantProps } from "class-variance-authority";

const statusVariantDefaults = {
  active: "bg-success text-success-foreground",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning text-muted-foreground",
  error: "bg-destructive text-destructive-foreground",
  warning: "bg-orange-500 text-orange-500",
};

const statusSizeDefaults = {
  sm: "h-4 rounded py-1 text-xs",
  md: "h-5 rounded py-2 text-sm",
  lg: "h-6 rounded py-3 text-base",
};

const statusVariants = cva("inline-flex items-center rounded", {
  variants: {
    variant: {
      active: statusVariantDefaults.active,
      inactive: statusVariantDefaults.inactive,
      pending: statusVariantDefaults.pending,
      error: statusVariantDefaults.error,
      warning: statusVariantDefaults.warning,
    },
    size: {
      sm: statusSizeDefaults.sm,
      md: statusSizeDefaults.md,
      lg: statusSizeDefaults.lg,
    },
  },
  defaultVariants: {
    variant: "active",
    size: "md",
  },
});

interface StatusIndicatorProps extends VariantProps<typeof statusVariants> {
  /** Status variant controls color */
  variant?: "active" | "inactive" | "pending" | "error" | "warning";
  /** Small/Medium/Large */
  size?: "sm" | "md" | "lg";
  /** Optional text label */
  text?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label */
  "aria-label"?: string;
}

export const StatusIndicator = React.memo(function StatusIndicator(props: StatusIndicatorProps) {
  const { variant, size, text, onClick, className, "aria-label": ariaLabel, ...rest } = props;
  const classes = cn(statusVariants({ variant, size }), className);

  return (
    <span
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel || text || "status"}
      {...rest}
    >
      {text ? <span>{text}</span> : <span />}
    </span>
  );
});
