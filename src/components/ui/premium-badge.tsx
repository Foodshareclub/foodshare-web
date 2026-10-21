import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PremiumBadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "soft" | "glow";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  default: "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(255,45,85,0.3)]",
  outline: "border border-primary/30 text-primary bg-transparent",
  soft: "bg-primary/10 text-primary",
  glow: "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,45,85,0.4)] animate-[pulse-glow_2s_ease-in-out_infinite]",
};

const sizeStyles = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function PremiumBadge({ children, className, variant = "default", size = "sm" }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-all duration-300",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
