import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with proper precedence (`clsx` + `tailwind-merge`).
 *
 * Single source of truth for class-name merging. Import from `@/lib/cn`
 * in new code; `@/lib/utils` re-exports this for backward compatibility.
 *
 * @example
 * cn("bg-primary", "text-primary-foreground") // => "bg-primary text-primary-foreground"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Default variant values for button components
 */
export const buttonVariantDefaults = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  brand: "bg-brand text-white hover:bg-brand-hover",
  "brand-outline": "border-2 border-brand text-brand hover:bg-brand/10",
  "brand-orange": "bg-brand-orange text-white hover:bg-brand-orange/90",
  glass: "glass glass-transition rounded-xl hover:shadow-lg",
  "glass-subtle": "glass-subtle glass-transition rounded-xl",
  "glass-prominent": "glass-prominent glass-transition rounded-xl",
  "glass-accent": "glass-accent-primary glass-transition rounded-xl",
};

/**
 * Default size values for button components
 */
export const buttonSizeDefaults = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  xl: "h-12 rounded-lg px-10 text-base",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8",
  "icon-lg": "h-12 w-12",
};

/**
 * Create a Tailwind class string with variant support for buttons
 * @param variants - object with variant and size keys
 * @param variants.variant - button variant (default, destructive, outline, etc.)
 * @param variants.size - button size (default, sm, lg, xl, icon)
 * @param className - additional Tailwind classes
 * @returns merged Tailwind class string
 */
export function buttonClasses(
  variants: {
    variant?: keyof typeof buttonVariantDefaults;
    size?: keyof typeof buttonSizeDefaults;
  },
  className?: string
): string {
  const { variant = "default", size = "default" } = variants;
  const variantMap: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    brand: "bg-brand text-white hover:bg-brand-hover",
    "brand-outline": "border-2 border-brand text-brand hover:bg-brand/10",
    "brand-orange": "bg-brand-orange text-white hover:bg-brand-orange/90",
    glass: "glass glass-transition rounded-xl hover:shadow-lg",
    "glass-subtle": "glass-subtle glass-transition rounded-xl",
    "glass-prominent": "glass-prominent glass-transition rounded-xl",
    "glass-accent": "glass-accent-primary glass-transition rounded-xl",
  };
  const sizeMap: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    xl: "h-12 rounded-lg px-10 text-base",
    icon: "h-10 w-10",
    "icon-sm": "h-8 w-8",
    "icon-lg": "h-12 w-12",
  };

  const base = variantMap[variant] || variantMap.default;
  const sizeClasses = sizeMap[size] || sizeMap.default;

  return cn(base, sizeClasses, className);
}
