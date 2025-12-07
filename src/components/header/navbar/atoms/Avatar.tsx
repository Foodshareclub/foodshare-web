import type { FC } from "react";
import { cn } from "@/lib/utils";
import { Avatar as AvatarPrimitive, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DEFAULT_AVATAR_URL } from "@/constants/storage";

export interface NavbarAvatarProps {
  /** Image URL for the avatar */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** User's first name for initials fallback */
  firstName?: string;
  /** User's last name for initials fallback */
  lastName?: string;
  /** @deprecated Use lastName instead */
  secondName?: string;
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

/** Generate initials from user name, with strawberry emoji fallback */
function getInitials(firstName?: string, lastName?: string): string {
  if (firstName || lastName) {
    const first = firstName?.charAt(0).toUpperCase() ?? "";
    const last = lastName?.charAt(0).toUpperCase() ?? "";
    return `${first}${last}`.trim() || "🍓";
  }
  return "🍓";
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
 *   firstName="John"
 *   lastName="Doe"
 *   hasNotification
 *   notificationCount={3}
 *   size="md"
 * />
 * ```
 */
export const NavbarAvatar: FC<NavbarAvatarProps> = ({
  src,
  alt = "User avatar",
  firstName,
  lastName,
  secondName,
  hasNotification = false,
  notificationCount,
  size = "md",
  className,
  onClick,
}) => {
  // Support deprecated secondName prop for backwards compatibility
  const resolvedLastName = lastName ?? secondName;
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

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={containerClasses}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <AvatarPrimitive className={sizeClasses[size]}>
        <AvatarImage src={src?.trim() || DEFAULT_AVATAR_URL} alt={alt} />
        <AvatarFallback>{getInitials(firstName, resolvedLastName)}</AvatarFallback>
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
};
