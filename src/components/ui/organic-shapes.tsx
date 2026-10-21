import { cn } from "@/lib/utils";

interface OrganicShapesProps {
  className?: string;
  variant?: "hero" | "section" | "subtle";
}

export function OrganicShapes({ className, variant = "hero" }: OrganicShapesProps) {
  if (variant === "subtle") {
    return (
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
        <div className="absolute -top-24 -end-24 size-96 rounded-full bg-primary/[0.03] dark:bg-primary/[0.06] blur-3xl" />
        <div className="absolute -bottom-32 -start-32 size-[500px] rounded-full bg-primary/[0.02] dark:bg-primary/[0.04] blur-3xl" />
      </div>
    );
  }

  if (variant === "section") {
    return (
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
        <div className="absolute top-0 end-0 size-[400px] rounded-full bg-gradient-to-bl from-primary/[0.06] to-transparent dark:from-primary/[0.1] blur-[100px]" />
        <div className="absolute bottom-0 start-0 size-[500px] rounded-full bg-gradient-to-tr from-primary/[0.04] to-transparent dark:from-primary/[0.08] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-gradient-to-r from-primary/[0.02] to-transparent dark:from-primary/[0.04] blur-[80px]" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-40 -end-40 size-[600px] rounded-full bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent dark:from-primary/[0.15] dark:via-primary/[0.08] blur-[100px] animate-[float_20s_ease-in-out_infinite]" />
      <div className="absolute -bottom-40 -start-40 size-[700px] rounded-full bg-gradient-to-tr from-primary/8 via-primary/4 to-transparent dark:from-primary/[0.12] dark:via-primary/[0.06] blur-[120px] animate-[float_25s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-1/3 start-1/4 size-[300px] rounded-full bg-gradient-to-r from-primary/6 to-transparent dark:from-primary/[0.08] blur-[60px] animate-[float_15s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 end-1/3 size-[250px] rounded-full bg-gradient-to-l from-primary/5 to-transparent dark:from-primary/[0.06] blur-[50px] animate-[float_18s_ease-in-out_infinite_reverse]" />
    </div>
  );
}
