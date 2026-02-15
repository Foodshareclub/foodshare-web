"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "default" | "outline" | "ghost";
}

export interface EmptyStateProps {
  /** Icon or emoji to display (e.g., "📦" or a Lucide icon) */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Visual variant */
  variant?: "default" | "filtered" | "search" | "error";
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    container: "p-8",
    icon: "text-4xl mb-3",
    title: "text-lg",
    description: "text-sm mb-4",
  },
  md: {
    container: "p-12",
    icon: "text-6xl mb-4",
    title: "text-xl",
    description: "text-base mb-6",
  },
  lg: {
    container: "p-16",
    icon: "text-7xl mb-5",
    title: "text-2xl",
    description: "text-lg mb-8",
  },
};

const variantIcons: Record<string, string> = {
  default: "📦",
  filtered: "🔍",
  search: "🔎",
  error: "⚠️",
};

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states with consistent styling.
 * Supports different variants, sizes, and optional action buttons.
 *
 * @example
 * // Basic usage with emoji
 * <EmptyState
 *   icon="📦"
 *   title="No items yet"
 *   description="Start adding items to see them here"
 * />
 *
 * @example
 * // With action button
 * <EmptyState
 *   title="No posts found"
 *   description="Create your first post to get started"
 *   action={{
 *     label: "Create Post",
 *     onClick: () => router.push('/new'),
 *     icon: <Plus className="h-4 w-4" />
 *   }}
 * />
 *
 * @example
 * // Search/filter variant
 * <EmptyState
 *   variant="filtered"
 *   title="No results found"
 *   description="Try adjusting your search or filters"
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
  size = "md",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  const displayIcon = icon ?? variantIcons[variant];

  return (
    <div
      className={cn("glass rounded-xl text-center animate-in fade-in slide-in-from-bottom-2 duration-300", sizes.container, className)}
    >
      {displayIcon && (
        <div className={cn(sizes.icon, "select-none")}>
          {typeof displayIcon === "string" ? (
            displayIcon
          ) : (
            <div className="flex justify-center text-muted-foreground">{displayIcon}</div>
          )}
        </div>
      )}

      <h2 className={cn("font-semibold text-foreground mb-2", sizes.title)}>{title}</h2>

      {description && (
        <p className={cn("text-muted-foreground", sizes.description)}>{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant}
              className={cn("gap-2", !action.variant && "bg-primary hover:bg-primary/90")}
            >
              {action.icon}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant ?? "outline"}
              className="gap-2"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
