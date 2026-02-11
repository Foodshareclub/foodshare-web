import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function SystemSegmentCard({
  name,
  count,
  color,
}: {
  name: string;
  count: number;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className={cn("rounded-lg p-2 w-fit mb-3", colors[color])}>
        <Users className="h-4 w-4" />
      </div>
      <p className="text-sm text-muted-foreground">{name}</p>
      <p className="text-xl font-bold">{count.toLocaleString()}</p>
    </div>
  );
}
