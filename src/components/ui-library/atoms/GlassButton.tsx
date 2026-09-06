import React from "react";
import { cn } from "@/lib/utils";

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: "default" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * GlassButton - A versatile button with glass morphism support
 * Uses Tailwind class merging for variant styling
 *
 * Usage:
 * <GlassButton variant="ghost" size="sm">Click me</GlassButton>
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = "default",
  size = "md",
  disabled,
  onClick,
  className,
}) => {
  const sizeMap = {
    sm: "h-8 px-3 text-sm rounded-md",
    md: "h-10 px-4 text-base rounded-md",
    lg: "h-12 px-6 text-lg rounded-md",
  };

  const variantMap = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "border border-border bg-transparent hover:bg-border/10",
    danger: "bg-error text-error-foreground hover:bg-error/90",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        sizeMap[size],
        variantMap[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
};
