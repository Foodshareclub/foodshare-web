"use client";

/**
 * SystemSegmentCard - Pre-defined system segment display
 */

import { cn } from "@/lib/utils";

const colorClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

interface SystemSegmentCardProps {
  name: string;
  count: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "violet" | "amber";
}

export function SystemSegmentCard({ name, count, icon, color }: SystemSegmentCardProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm",
        colorClasses[color]
      )}
    >
      <div className="p-2 rounded-lg bg-current/10">{icon}</div>
      <div className="text-left">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-lg font-bold tabular-nums">{count.toLocaleString()}</p>
      </div>
    </button>
  );
}
