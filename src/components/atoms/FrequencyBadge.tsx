"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

// ─── FrequencyBadge — Standalone Atom ───────────────────────────────────────
//
// Displays a frequency badge (e.g., daily/weekly/monthly/one-time).
// Pure props-driven, zero runtime state. Lightweight for ISR/SSG compatibility.
//
// ✅ Phase 1.2: Web/Next.js — App Router + TPA + Cache Components
// ✅ Safe to use inside `async` components and ISR cacheLife windows.

interface FrequencyBadgeProps {
  /** Frequency key maps to pre-styled variant */
  frequency: "daily" | "weekly" | "monthly" | "one-time" | "custom";
  /** Custom text when frequency = "custom" */
  customText?: string;
  /** Small/Medium/Large */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** ARIA label */
  "aria-label"?: string;
}

const frequencyColors = {
  daily: "bg-primary text-primary-foreground",
  weekly: "bg-secondary text-secondary-foreground",
  monthly: "bg-muted text-muted-foreground",
  "one-time": "bg-success text-success-foreground",
  custom: "bg-input text-input-foreground",
};

const frequencyBg = {
  daily: "bg-primary/10",
  weekly: "bg-secondary/10",
  monthly: "bg-muted/10",
  "one-time": "bg-success/10",
  custom: "bg-input/10",
};

const sizeStyles = {
  sm: "h-5 w-5 rounded text-xs px-1",
  md: "h-6 w-6 rounded text-sm px-2",
  lg: "h-7 w-7 rounded text-base px-3",
};

export const FrequencyBadge = ({
  frequency = "weekly",
  customText,
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...props
}: FrequencyBadgeProps) => {
  const classes = cn(
    "inline-flex items-center rounded-full border gap-1.5",
    sizeStyles[size],
    frequencyColors[frequency],
    frequencyBg[frequency],
    className
  );

  const label = customText || frequency;

  return (
    <span className={classes} aria-label={ariaLabel || label}>
      {label}
    </span>
  );
}; // end FrequencyBadge
