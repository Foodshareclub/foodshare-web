import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
  variant?: "line" | "gradient" | "dots";
}

export function SectionDivider({ className, variant = "gradient" }: SectionDividerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-8", className)} aria-hidden="true">
        <div className="size-1.5 rounded-full bg-primary/30" />
        <div className="size-1.5 rounded-full bg-primary/50" />
        <div className="size-1.5 rounded-full bg-primary/70" />
        <div className="size-1.5 rounded-full bg-primary/50" />
        <div className="size-1.5 rounded-full bg-primary/30" />
      </div>
    );
  }

  if (variant === "line") {
    return <div className={cn("h-px w-full bg-border", className)} aria-hidden="true" />;
  }

  return (
    <div className={cn("relative h-px w-full", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-sm" />
    </div>
  );
}
