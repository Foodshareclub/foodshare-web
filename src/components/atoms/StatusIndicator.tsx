"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

// ─── StatusIndicator — Standalone Atom ───────────────────────────────────────
//
// Displays a colored status pill (e.g., active/inactive/pending/error).
// Pure props, zero internal state. Composable via variant + size props.
//
// ✅ Phase 1.2: Web/Next.js — App Router + TPA + Cache Components
// ✅ Can be used inline or as a standalone component — 5 lines max anywhere.

interface StatusIndicatorProps {
  /** Status variant controls color */
  variant: "active" | "inactive" | "pending" | "error" | "warning";
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

const variantStyles = {
  active: "bg-success text-success-foreground",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-primary text-primary-foreground",
  error: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
};

const sizeStyles = {
  sm: "h-4 w-4 rounded-xs",
  md: "h-5 w-5 rounded",
  lg: "h-6 w-6 rounded-lg",
};

export const StatusIndicator = ({
  variant = "active",
  size = "md",
  text,
  onClick,
  className,
  "aria-label": ariaLabel,
  ...props
}: StatusIndicatorProps) => {
  const baseClasses = `inline-flex items-center rounded-full transition-colors`;

  return (
    <button
      className={cn(baseClasses, variantStyles[variant], sizeStyles[size], className)}
      onClick={onClick}
      aria-label={ariaLabel || text || "status"}
      {...props}
    >
      {text ? (
        <span className="align-middle text-xs font-medium">{text}</span>
      ) : (
        <span className="align-middle" />
      )}
    </button>
  );
}; // end StatusIndicator
