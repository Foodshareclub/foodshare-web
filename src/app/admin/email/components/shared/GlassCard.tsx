import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
