"use client";

/**
 * EmptyState - Placeholder component for empty lists
 * Provides consistent empty state UI across the dashboard
 */

import type { EmptyStateProps } from "../types";

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <div className="text-muted-foreground/50 mb-3">{icon}</div>
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>}
      {action}
    </div>
  );
}
