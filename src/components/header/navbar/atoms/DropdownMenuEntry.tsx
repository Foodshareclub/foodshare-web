import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A row inside a Radix `DropdownMenu`.
 *
 * This exists because the alternative — a `<div role="menuitem">` inside
 * `DropdownMenuContent` — silently breaks the menu pattern:
 *
 *   - Arrow keys never reach it. Radix implements roving focus and typeahead
 *     over *its own* `DropdownMenuItem` children, driven by the `Collection`
 *     and `data-highlighted`. An item outside that collection is not focusable
 *     by the menu, so the primary keyboard path through a menu is dead.
 *   - It never receives `data-highlighted`, so neither Radix's
 *     `data-[highlighted]:bg-accent` nor a manual `focus:ring` fires — Radix
 *     only focuses its own items, so the focus style the item declares never
 *     triggers.
 *   - Typeahead cannot see it, so typing "l" to jump to "Log Out" does nothing.
 *   - `role="menuitem"` without a managed focus contradicts the `role="menu"`
 *     the primitive already sets.
 *
 * Rendering the primitive means all of that comes for free, and the visual
 * language is passed through `className` so the menu looks identical.
 */
export interface DropdownMenuEntryProps {
  label: ReactNode;
  /** Called on selection. Radix's `onSelect`, not `onClick` — it fires on
   *  Enter, Space and click, and it closes the menu, which a click handler on a
   *  hand-rolled div never did. */
  onSelect: () => void;
  icon?: ReactNode;
  badge?: ReactNode;
  variant?: "default" | "accent" | "danger";
  className?: string;
  testId?: string;
}

const variantClasses = {
  default: "",
  // Matches the MenuItem palette so the two are indistinguishable side by side.
  accent: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 focus:bg-green-50",
  danger: "text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20",
} as const;

export function DropdownMenuEntry({
  label,
  onSelect,
  icon,
  badge,
  variant = "default",
  className,
  testId,
}: DropdownMenuEntryProps) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      data-testid={testId}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        variantClasses[variant],
        className,
      )}
    >
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1 text-start text-sm font-medium">{label}</span>
      {badge && <span className="flex-shrink-0 text-xs">{badge}</span>}
    </DropdownMenuItem>
  );
}
