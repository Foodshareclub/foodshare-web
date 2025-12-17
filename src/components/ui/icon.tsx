import { type LucideIcon, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-10 w-10",
} as const;

export type IconSize = keyof typeof sizeClasses;

export interface IconProps extends Omit<LucideProps, "size"> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Size variant */
  size?: IconSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Icon - Standardized icon wrapper for consistent sizing
 *
 * Uses Lucide icons with predefined size variants for consistency
 * across the application.
 *
 * @example
 * import { Home, Settings, User } from "lucide-react";
 *
 * <Icon icon={Home} size="md" />
 * <Icon icon={Settings} size="lg" className="text-primary" />
 * <Icon icon={User} size="sm" />
 */
export function Icon({ icon: IconComponent, size = "md", className, ...props }: IconProps) {
  return <IconComponent className={cn(sizeClasses[size], className)} {...props} />;
}

/**
 * IconButton wrapper props (for use with Button)
 */
export interface IconButtonProps {
  icon: LucideIcon;
  size?: IconSize;
  label: string; // Required for accessibility
}

/**
 * Helper to create icon element for Button components
 *
 * @example
 * <Button>
 *   {iconElement(Home, "sm")}
 *   Go Home
 * </Button>
 */
export function iconElement(IconComponent: LucideIcon, size: IconSize = "sm", className?: string) {
  return <IconComponent className={cn(sizeClasses[size], className)} />;
}

export default Icon;
