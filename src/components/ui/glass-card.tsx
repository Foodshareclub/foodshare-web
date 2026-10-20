import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  intensity?: "subtle" | "medium" | "strong";
}

const intensityStyles = {
  subtle: "bg-white/60 dark:bg-white/[0.03] border-white/40 dark:border-white/[0.08]",
  medium: "bg-white/70 dark:bg-white/[0.05] border-white/50 dark:border-white/[0.12]",
  strong: "bg-white/80 dark:bg-white/[0.08] border-white/60 dark:border-white/[0.16]",
};

export function GlassCard({ children, className, hover = true, intensity = "medium" }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        intensityStyles[intensity],
        hover &&
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent dark:from-white/[0.05] dark:via-transparent dark:to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
