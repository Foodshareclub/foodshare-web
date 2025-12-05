import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Glass Component - Tailwind v4 Implementation
 * 
 * Uses @utility classes defined in globals.css for true Tailwind integration.
 * Supports all Tailwind variants: hover:, dark:, md:, etc.
 * 
 * @example
 * <Glass variant="subtle" className="p-4 rounded-xl">Content</Glass>
 * <Glass variant="prominent" hover>Card with hover effect</Glass>
 */

const glassVariants = cva("", {
  variants: {
    variant: {
      default: "glass",
      subtle: "glass-subtle",
      prominent: "glass-prominent",
      strong: "glass-strong",
      overlay: "glass-overlay",
      input: "glass-input",
      accent: "glass-accent-primary",
      "accent-orange": "glass-accent-orange",
    },
    rounded: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
      full: "rounded-full",
    },
  },
  defaultVariants: {
    variant: "default",
    rounded: "xl",
  },
});

export interface GlassProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassVariants> {
  /** Enable hover transition effects */
  hover?: boolean;
  /** Enable GPU acceleration for animations */
  gpu?: boolean;
  /** Render as a different element */
  as?: React.ElementType;
}

const Glass = React.forwardRef<HTMLDivElement, GlassProps>(
  ({ className, variant, rounded, hover, gpu, as: Component = "div", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          glassVariants({ variant, rounded }),
          hover && "glass-transition hover:shadow-lg",
          gpu && "gpu",
          className
        )}
        {...props}
      />
    );
  }
);
Glass.displayName = "Glass";

/**
 * Pre-configured Glass variants for common use cases
 */
const GlassCard = React.forwardRef<HTMLDivElement, Omit<GlassProps, "variant">>(
  ({ className, ...props }, ref) => (
    <Glass ref={ref} variant="default" hover className={cn("p-5", className)} {...props} />
  )
);
GlassCard.displayName = "GlassCard";

const GlassPanel = React.forwardRef<HTMLDivElement, Omit<GlassProps, "variant">>(
  ({ className, ...props }, ref) => (
    <Glass ref={ref} variant="prominent" className={cn("p-6", className)} {...props} />
  )
);
GlassPanel.displayName = "GlassPanel";

export { Glass, GlassCard, GlassPanel, glassVariants };
