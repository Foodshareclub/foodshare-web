import { memo, type FC } from "react";
import { cn } from "@/lib/utils";
import { Avatar as AvatarPrimitive, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface NavbarAvatarProps {
  /** Image URL for the avatar */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Display notification badge */
  hasNotification?: boolean;
  /** Number to display in badge (optional) */
  notificationCount?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-[42px] w-[42px]",
  lg: "h-12 w-12",
} as const;

const badgeSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

/**
 * Atomic Avatar Component
 *
 * Displays user avatar with optional notification badge.
 * Follows shadcn/ui patterns with additional navbar-specific features.
 *
 * @example
 * ```tsx
 * <NavbarAvatar
 *   src="/avatar.jpg"
 *   hasNotification
 *   notificationCount={3}
 *   size="md"
 * />
 * ```
 */
export const NavbarAvatar: FC<NavbarAvatarProps> = memo(
  ({
    src,
    alt = "User avatar",
    hasNotification = false,
    notificationCount,
    size = "md",
    className,
    onClick,
  }) => {
    const containerClasses = cn(
      "relative rounded-full cursor-pointer transition-transform hover:scale-105",
      sizeClasses[size],
      hasNotification && [
        "after:content-['']",
        "after:absolute after:bottom-0 after:right-0",
        "after:bg-green-300 after:border-2 after:border-background",
        "after:rounded-full",
        badgeSizeClasses[size],
      ],
      className
    );

    return (
      <div className={containerClasses} onClick={onClick} role={onClick ? "button" : undefined}>
        <AvatarPrimitive className={sizeClasses[size]}>
          {src && <AvatarImage src={src} alt={alt} />}
          <AvatarFallback>{alt.charAt(0).toUpperCase()}</AvatarFallback>
        </AvatarPrimitive>
        {hasNotification && notificationCount && notificationCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center",
              "min-w-5 h-5 px-1 rounded-full",
              "bg-red-500 text-white text-xs font-semibold",
              "border-2 border-background"
            )}
            aria-label={`${notificationCount} notifications`}
          >
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </div>
    );
  }
);

NavbarAvatar.displayName = "NavbarAvatar";
