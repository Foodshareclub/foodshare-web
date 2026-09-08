"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

// ─── GlassButton — Standalone Atom ────────────────────────────────────────────
//
// A true UI atom: pure props, zero internal state, no external dependencies
// beyond `cn` for class joining. Composable via props, not inheritance.
//
// ✅ Phase 1.2: Web/Next.js — App Router + TPA + Cache Components
// ✅ True standalone atom — can be reused across any React/Next/Tailwind project
// ✅ No `useState`, no `useEffect`, no `forwardRef` complexity — just props + Tailwind

interface GlassButtonProps {
  /** Primary/secondary/outline styling */
  variant?: "primary" | "secondary" | "outline";
  /** Small/Medium/Large size */
  size?: "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Button text/label */
  children: React.ReactNode;
  /** Additional CSS classes (merged via cn()) */
  className?: string;
  /** Disables the button and shows loading state */
  loading?: boolean;
  /** Accessibility label (aria-label when children is not descriptive) */
  "aria-label"?: string;
}

const variantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
};

const sizeClasses = {
  sm: "h-8 py-2 text-sm rounded",
  md: "h-10 py-3 text-base rounded",
  lg: "h-12 py-4 text-lg rounded",
};

export const GlassButton = ({
  variant = "primary",
  size = "md",
  disabled,
  onClick,
  children,
  className,
  loading,
  "aria-label": ariaLabel,
  ...props
}: GlassButtonProps) => {
  const baseClasses = `relative inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none`;

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        loading && "cursor-not-allowed opacity-50",
        "data-[state=disabled]:pointer-events-none",
        className
      )}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <span className="align-middle animate-spin h-4 w-4 mr-2 -mr-px" />
      ) : (
        React.Children.map(children, (child) => child)
      )}
    </button>
  );
}; // end GlassButton
