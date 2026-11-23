"use client";
import { type CoverCredit } from "@/lib/cover-provenance";
import { cn } from "@/lib/utils";
import {
  HeartHandshake,
  Leaf,
  Loader2,
  Package,
  Repeat,
  Snowflake,
  Sparkles,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

interface CategoryTheme {
  icon: LucideIcon;
  gradient: string;
  label: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  food: {
    icon: Utensils,
    gradient:
      "from-amber-500/15 via-orange-500/10 to-emerald-500/15 dark:from-amber-950/30 dark:via-neutral-900 dark:to-emerald-950/25",
    label: "Community Food",
  },
  vegan: {
    icon: Leaf,
    gradient:
      "from-emerald-500/15 via-green-500/10 to-teal-500/15 dark:from-emerald-950/30 dark:via-neutral-900 dark:to-teal-950/25",
    label: "Community Food",
  },
  fridge: {
    icon: Snowflake,
    gradient:
      "from-cyan-500/15 via-sky-500/10 to-blue-500/15 dark:from-cyan-950/30 dark:via-neutral-900 dark:to-blue-950/25",
    label: "Community Fridge",
  },
  foodbank: {
    icon: HeartHandshake,
    gradient:
      "from-rose-500/15 via-amber-500/10 to-orange-500/15 dark:from-rose-950/30 dark:via-neutral-900 dark:to-amber-950/25",
    label: "Food Bank",
  },
  borrow: {
    icon: Repeat,
    gradient:
      "from-indigo-500/15 via-purple-500/10 to-blue-500/15 dark:from-indigo-950/30 dark:via-neutral-900 dark:to-purple-950/25",
    label: "Borrow",
  },
  wanted: {
    icon: Sparkles,
    gradient:
      "from-pink-500/15 via-rose-500/10 to-amber-500/15 dark:from-pink-950/30 dark:via-neutral-900 dark:to-rose-950/25",
    label: "Wanted",
  },
  volunteer: {
    icon: Users,
    gradient:
      "from-teal-500/15 via-emerald-500/10 to-cyan-500/15 dark:from-teal-950/30 dark:via-neutral-900 dark:to-cyan-950/25",
    label: "Volunteer",
  },
  zerowaste: {
    icon: Leaf,
    gradient:
      "from-green-500/15 via-emerald-500/10 to-lime-500/15 dark:from-green-950/30 dark:via-neutral-900 dark:to-emerald-950/25",
    label: "Zero Waste",
  },
};

const DEFAULT_THEME: CategoryTheme = {
  icon: Package,
  gradient:
    "from-neutral-500/10 via-neutral-400/5 to-neutral-600/10 dark:from-neutral-800/30 dark:via-neutral-900 dark:to-neutral-950/25",
  label: "Community Item",
};

/**
 * Airbnb-grade tactile fallback cover for listings whose photos are missing,
 * dead, or actively awaiting enrichment.
 */
export function FindingPhotoState({
  label,
  postName,
  postType,
  className,
}: {
  label: string;
  postName?: string;
  postType?: string;
  className?: string;
}) {
  const message = `Finding a photo for this ${label} listing…`;
  const normalizedType = postType?.toLowerCase() || "";
  const theme = CATEGORY_THEMES[normalizedType] || DEFAULT_THEME;
  const Icon = theme.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="finding-photo"
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center p-4 select-none overflow-hidden",
        "bg-gradient-to-br",
        theme.gradient,
        className,
      )}
    >
      <div className="relative flex flex-col items-center justify-center gap-2 text-center z-10 max-w-[85%]">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl border shadow-2xs backdrop-blur-md transition-transform duration-300 motion-safe:group-hover/card:scale-105",
            "bg-white/85 dark:bg-neutral-900/85 border-white/60 dark:border-white/10",
          )}
        >
          <Icon className="size-5.5 text-foreground/80" aria-hidden="true" />
        </div>

        {postName && (
          <span className="text-[13px] font-semibold tracking-tight text-foreground/90 truncate max-w-full">
            {postName}
          </span>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 dark:bg-neutral-900/75 border border-white/50 dark:border-white/10 text-muted-foreground shadow-2xs backdrop-blur-sm">
          <Loader2
            className="size-3 animate-spin motion-reduce:animate-none text-primary shrink-0"
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium tracking-tight text-foreground/80">{message}</span>
        </div>
      </div>
    </div>
  );
}

/** Disclosure plus source/license credit for a stored reference cover. */
export function CoverCreditLine({ credit, className }: { credit: CoverCredit; className?: string }) {
  const link = "underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div
      data-testid="cover-credit"
      className={cn(
        "rounded-lg bg-black/65 px-2 py-1 text-[10px] leading-tight text-white/90 backdrop-blur-sm",
        className,
      )}
    >
      <p>{credit.disclosure}</p>
      <p>
        <a href={credit.sourcePageUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {"Source: Wikimedia Commons"}
          {credit.artist ? ` · ${credit.artist}` : ""}
        </a>
        {" · "}
        {credit.licenseUrl ? (
          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
            {credit.license}
          </a>
        ) : (
          <span>{credit.license}</span>
        )}
      </p>
    </div>
  );
}
