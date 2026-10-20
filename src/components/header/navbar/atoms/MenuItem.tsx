import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A menu row for contexts that are not ARIA menus — cards, table rows, drawers.
 *
 * For a Radix `DropdownMenu`, use `DropdownMenuEntry` instead. This component is
 * a `<button>`, not a `div role="menuitem"` with a hand-rolled `onKeyDown`:
 * a real button is focusable, activates on Enter *and* Space natively, and
 * exposes the right role without claiming to be part of a menu that does not
 * exist. `role="menuitem"` outside a `role="menu"` is a lie the accessibility
 * tree then has to reconcile, and it inherits none of the keyboard handling the
 * real menu pattern provides.
 */
export interface MenuItemProps {
  /** Menu item label (can be a Trans component or string) */
  label: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional badge (e.g., notification count) */
  badge?: ReactNode;
  /** Variant style */
  variant?: "default" | "accent" | "danger";
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Render as a disabled row without firing onClick */
  disabled?: boolean;
}

const variantClasses = {
  default: "hover:bg-accent hover:text-accent-foreground",
  accent: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
  danger: "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
} as const;

/**
 * Atomic MenuItem Component
 *
 * Reusable menu item for dropdowns and drawers.
 * Supports icons, badges, and different variants.
 *
 * @example
 * ```tsx
 * <MenuItem
 *   label={"My Messages"}
 *   icon={<MessageIcon />}
 *   badge={<span>3</span>}
 *   onClick={handleClick}
 * />
 * ```
 */
export function MenuItem({
  label,
  onClick,
  icon,
  badge,
  variant = "default",
  className,
  testId,
  disabled = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-start",
        "rounded-lg transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
    >
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge && <span className="flex-shrink-0 text-xs">{badge}</span>}
    </button>
  );
}
