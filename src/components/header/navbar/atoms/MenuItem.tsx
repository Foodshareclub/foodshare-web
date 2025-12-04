import { memo, type FC, type ReactNode } from "react";

import { cn } from "@/lib/utils";

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
export const MenuItem: FC<MenuItemProps> = memo(
  ({ label, onClick, icon, badge, variant = "default", className, testId }) => {
    return (
      <div
        role="menuitem"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        data-testid={testId}
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer",
          "rounded-lg transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          variantClasses[variant],
          className
        )}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-sm font-medium">{label}</span>
        {badge && <span className="flex-shrink-0 text-xs">{badge}</span>}
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";
