"use client";

import { useEffect, useState } from "react";

import { evaluateOpenState, formatClock, type WeeklyHours } from "@/lib/opening-hours";
import { cn } from "@/lib/utils";

const BASE = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";
const STYLES: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  opens_at: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  closed: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

type OpenStatusProps = {
  hours?: WeeklyHours | null;
  timezone?: string | null;
  className?: string;
};

/**
 * The listing's open state at the current moment.
 *
 * The clock is read in an effect so the server render stays deterministic:
 * a known schedule shows a neutral "Hours" chip until the client mounts, and
 * an unknown one shows "Hours unavailable" on both sides. It re-evaluates
 * every minute so a page left open crosses opening and closing times.
 */
export function OpenStatus({ hours, timezone, className }: OpenStatusProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!hours || !timezone) {
    return <span className={cn(BASE, STYLES.unknown, className)}>Hours unavailable</span>;
  }
  if (!now) {
    return (
      <span className={cn(BASE, STYLES.unknown, className)} aria-label="Checking hours">
        Hours
      </span>
    );
  }

  const state = evaluateOpenState(hours, timezone, now);
  if (state.kind === "unknown") {
    return <span className={cn(BASE, STYLES.unknown, className)}>Hours unavailable</span>;
  }
  const label =
    state.kind === "open" ? "Open now" : state.kind === "closed" ? "Closed" : `Opens at ${formatClock(state.at)}`;
  return (
    <span className={cn(BASE, STYLES[state.kind], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </span>
  );
}
