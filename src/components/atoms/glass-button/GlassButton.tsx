import * as React from "react";
import { cn } from "@/lib/cn";

import { cva, type VariantProps } from "class-variance-authority";

const buttonVariantDefaults = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
};

const buttonSizeDefaults = {
  sm: "h-9 rounded-md px-3",
  md: "h-10 rounded-md px-4 py-2",
  lg: "h-11 rounded-md px-8",
};

const buttonVariants = cva("inline-flex items-center justify-center transition-colors", {
  variants: {
    variant: {
      primary: buttonVariantDefaults.primary,
      secondary: buttonVariantDefaults.secondary,
      outline: buttonVariantDefaults.outline,
    },
    size: {
      sm: buttonSizeDefaults.sm,
      md: buttonSizeDefaults.md,
      lg: buttonSizeDefaults.lg,
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

interface GlassButtonProps extends VariantProps<typeof buttonVariants> {
  /** Primary/secondary/outline styling */
  variant?: "primary" | "secondary" | "outline";
  /** Small/Medium/Large size */
  size?: "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Button text/label */
  children: React.ReactNode;
  /** Additional CSS classes (merged via cn()) */
  className?: string;
  /** Disables the button and shows loading state */
  loading?: boolean;
  /** Accessibility label (aria-label when children is not descriptive) */
  "aria-label"?: string;
}

export const GlassButton = React.memo(function GlassButton(props: GlassButtonProps) {
  const {
    variant,
    size,
    disabled,
    loading,
    children,
    className,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel || children?.toString() || "button"}
      {...rest}
    >
      {loading ? <span className="spinner spinner-sm inline-block mr-2 animate-spin" /> : children}
    </button>
  );
});
