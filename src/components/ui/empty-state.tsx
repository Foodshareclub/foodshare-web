import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {icon && (
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/5 dark:bg-primary/10">
          <div className="text-primary/60">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>}
      {action && <div className="flex gap-3">{action}</div>}
    </div>
  );
}
