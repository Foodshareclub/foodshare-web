import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glow";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  /** When set, renders a Link instead of a button: a control that navigates is
   * a link, and only a link gets keyboard focus, middle-click and
   * open-in-new-tab for free. */
  href?: string;
}

const variantStyles = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_8px_rgba(255,45,85,0.3)] hover:shadow-[0_4px_16px_rgba(255,45,85,0.4)]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50",
  ghost: "text-foreground hover:bg-muted",
  glow: "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,45,85,0.4)] hover:shadow-[0_0_30px_rgba(255,45,85,0.6)] animate-[pulse-glow_2s_ease-in-out_infinite]",
};

const sizeStyles = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-6 text-base rounded-xl",
  lg: "h-14 px-8 text-lg rounded-xl",
  xl: "h-16 px-10 text-xl rounded-2xl",
};

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      href,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      "relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      "active:scale-[0.98]",
      variantStyles[variant],
      sizeStyles[size],
      className,
    );

    const inner = (
      <>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {!loading && icon && iconPosition === "left" && (
          <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === "right" && (
          <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
        )}
        {variant === "glow" && (
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 animate-[shimmer_2s_infinite]" />
        )}
      </>
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {inner}
        </Link>
      );
    }

    return (
      <button ref={ref} disabled={disabled || loading} className={classes} {...props}>
        {inner}
      </button>
    );
  },
);

PremiumButton.displayName = "PremiumButton";
