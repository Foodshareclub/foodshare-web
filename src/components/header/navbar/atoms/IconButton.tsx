import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon to display */
  icon: ReactNode;
  /** Button label for accessibility */
  label: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Variant style */
  variant?: "ghost" | "default" | "outline" | "secondary";
  /** Display notification badge */
  hasNotification?: boolean;
  /** Active/selected state */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 p-1",
  md: "h-10 w-10 p-2",
  lg: "h-12 w-12 p-3",
} as const;

/**
 * Atomic IconButton Component
 *
 * Reusable icon button with consistent styling and accessibility.
 * Supports notification badges and active states.
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<SearchIcon />}
 *   label="Search"
 *   hasNotification
 *   onClick={handleClick}
 * />
 * ```
 */
export function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  hasNotification = false,
  isActive = false,
  className,
  ...props
}: IconButtonProps) {
    return (
      <Button
        variant={variant}
        className={cn(
          "relative rounded-full transition-all",
          sizeClasses[size],
          isActive && "bg-accent text-accent-foreground",
          className
        )}
        aria-label={label}
        {...props}
      >
        {icon}
        {hasNotification && (
          <span
            className={cn(
              "absolute bottom-0 right-0",
              "w-3 h-3 rounded-full",
              "bg-green-300 border-2 border-white dark:border-gray-900"
            )}
            aria-label="Has notification"
          />
        )}
      </Button>
    );
}
