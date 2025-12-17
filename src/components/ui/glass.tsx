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
 * // Basic glass panel
 * <Glass variant="subtle" className="p-4 rounded-xl">Content</Glass>
 *
 * // Card with standardized hover effect
 * <Glass variant="default" hoverEffect="default" glow>Interactive card</Glass>
 *
 * // Prominent hover for featured cards
 * <Glass variant="prominent" hoverEffect="prominent">Featured content</Glass>
 *
 * // Pre-configured card with hover
 * <GlassCard>Card with default hover</GlassCard>
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
    hoverEffect: {
      none: "",
      subtle: "card-transition card-hover-subtle",
      default: "card-transition card-hover",
      prominent: "card-transition card-hover-prominent",
    },
  },
  defaultVariants: {
    variant: "default",
    rounded: "xl",
    hoverEffect: "none",
  },
});

export interface GlassProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof glassVariants> {
  /**
   * @deprecated Use hoverEffect="default" instead
   * Enable hover transition effects (legacy, maps to hoverEffect="default")
   */
  hover?: boolean;
  /** Add border glow effect on hover */
  glow?: boolean;
  /** Enable GPU acceleration for animations */
  gpu?: boolean;
  /** Render as a different element */
  as?: React.ElementType;
}

const Glass = React.forwardRef<HTMLDivElement, GlassProps>(
  (
    { className, variant, rounded, hoverEffect, hover, glow, gpu, as: Component = "div", ...props },
    ref
  ) => {
    // Map legacy hover prop to new hoverEffect system
    const resolvedHoverEffect = hoverEffect ?? (hover ? "default" : "none");

    return (
      <Component
        ref={ref}
        className={cn(
          glassVariants({ variant, rounded, hoverEffect: resolvedHoverEffect }),
          glow && "card-hover-glow",
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
  ({ className, hoverEffect = "default", ...props }, ref) => (
    <Glass
      ref={ref}
      variant="default"
      hoverEffect={hoverEffect}
      glow
      className={cn("p-5", className)}
      {...props}
    />
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
