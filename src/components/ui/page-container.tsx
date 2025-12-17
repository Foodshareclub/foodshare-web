import { cn } from "@/lib/utils";

/**
 * PageContainer - Consistent max-width container for page content
 *
 * Prevents content from stretching on ultra-wide displays and provides
 * consistent horizontal padding across the application.
 *
 * @example
 * // Default container (max-w-screen-2xl)
 * <PageContainer>Page content here</PageContainer>
 *
 * @example
 * // Smaller container for forms
 * <PageContainer maxWidth="md">Form content</PageContainer>
 *
 * @example
 * // Full width (no max-width)
 * <PageContainer maxWidth="full" padding={false}>Map content</PageContainer>
 */

const maxWidthClasses = {
  sm: "max-w-2xl", // 672px - Small forms, dialogs
  md: "max-w-4xl", // 896px - Medium content, settings
  lg: "max-w-5xl", // 1024px - Larger content areas
  xl: "max-w-6xl", // 1152px - Wide content
  "2xl": "max-w-7xl", // 1280px - Extra wide
  default: "max-w-screen-2xl", // 1536px - Default page width
  full: "", // No max-width constraint
} as const;

export type MaxWidthVariant = keyof typeof maxWidthClasses;

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width variant
   * @default "default"
   */
  maxWidth?: MaxWidthVariant;
  /**
   * Apply horizontal padding (responsive: px-4 md:px-6 lg:px-8)
   * @default true
   */
  padding?: boolean;
  /**
   * Center the container horizontally
   * @default true
   */
  centered?: boolean;
  /**
   * Render as a different element
   * @default "div"
   */
  as?: "div" | "section" | "article" | "main";
}

export function PageContainer({
  children,
  maxWidth = "default",
  padding = true,
  centered = true,
  as: Component = "div",
  className,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "w-full",
        centered && "mx-auto",
        padding && "px-4 md:px-7 xl:px-20",
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Pre-configured variants for common use cases
 */

/** Container for form content - narrower width */
export function FormContainer({ className, ...props }: Omit<PageContainerProps, "maxWidth">) {
  return <PageContainer maxWidth="md" className={cn("py-8", className)} {...props} />;
}

/** Container for settings pages */
export function SettingsContainer({ className, ...props }: Omit<PageContainerProps, "maxWidth">) {
  return <PageContainer maxWidth="lg" className={cn("py-6", className)} {...props} />;
}

/** Container for full-width content like maps */
export function FullWidthContainer({
  className,
  ...props
}: Omit<PageContainerProps, "maxWidth" | "padding">) {
  return <PageContainer maxWidth="full" padding={false} className={className} {...props} />;
}
