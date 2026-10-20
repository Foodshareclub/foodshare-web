import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { GlassCard } from "./glass-card";
import { MeshGradient } from "./mesh-gradient";
import { OrganicShapes } from "./organic-shapes";

interface HeroSectionProps {
  badge?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  gradientVariant?: "primary" | "warm" | "cool" | "sunset";
}

export function HeroSection({
  badge,
  title,
  subtitle,
  children,
  className,
  gradientVariant = "primary",
}: HeroSectionProps) {
  return (
    <section className={cn("relative overflow-hidden py-16 sm:py-24 lg:py-32", className)}>
      <MeshGradient variant={gradientVariant} className="opacity-40 dark:opacity-60" />
      <OrganicShapes variant="hero" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-6 sm:gap-8">
          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary dark:text-primary/90 backdrop-blur-sm animate-[slide-up_0.6s_ease-out]">
              <span className="size-1.5 rounded-full bg-primary animate-[pulse-glow_2s_ease-in-out_infinite]" />
              {badge}
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground animate-[slide-up_0.6s_ease-out_0.1s_both]">
            {title}
          </h1>

          {subtitle && (
            <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed animate-[slide-up_0.6s_ease-out_0.2s_both]">
              {subtitle}
            </p>
          )}

          {children && <div className="w-full mt-4 animate-[slide-up_0.6s_ease-out_0.3s_both]">{children}</div>}
        </div>
      </div>
    </section>
  );
}

interface HeroStatProps {
  value: string;
  label: string;
  icon?: ReactNode;
}

export function HeroStat({ value, label, icon }: HeroStatProps) {
  return (
    <GlassCard hover intensity="subtle" className="p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {icon && <div className="text-primary">{icon}</div>}
        <span className="text-2xl sm:text-3xl font-bold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </GlassCard>
  );
}
