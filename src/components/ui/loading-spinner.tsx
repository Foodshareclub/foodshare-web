import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse";
  /** Accessible name announced while the spinner is on screen. Required rather
   * than defaulted: it is user-facing copy, and a hardcoded English default
   * would render in English in all 20 other locales. */
  label: string;
}

const sizeStyles = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
};

export function LoadingSpinner({ className, size = "md", variant = "spinner", label }: LoadingSpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-1", className)} role="status" aria-label={label}>
        <div className="size-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" />
        <div className="size-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.15s_infinite]" />
        <div className="size-2 rounded-full bg-primary animate-[bounce_1s_ease-in-out_0.3s_infinite]" />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("relative", sizeStyles[size], className)} role="status" aria-label={label}>
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-[ping_1.5s_ease-out_infinite]" />
        <div className="absolute inset-0 rounded-full bg-primary/40 animate-[ping_1.5s_ease-out_0.5s_infinite]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-2 rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 border-primary/20 border-t-primary animate-spin",
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label={label}
    />
  );
}
