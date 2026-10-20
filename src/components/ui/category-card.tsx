import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  count?: number;
  /** Pre-translated count label (e.g. "12 items"). Preferred over `count`,
   * because the plural form belongs to the message, not to this component. */
  countLabel?: string;
  onClick?: () => void;
  /** When set, the card is a link — a card that navigates is a link, not a
   * button, and only a link gets keyboard focus and middle-click for free. */
  href?: string;
  className?: string;
  variant?: "default" | "compact";
}

export function CategoryCard({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  onClick,
  href,
  className,
  variant = "default",
}: CategoryCardProps) {
  const content = (
    <>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-primary/5 dark:bg-primary/10 transition-all duration-500",
          "group-hover:bg-primary/10 group-hover:scale-110",
          variant === "compact" ? "size-12 shrink-0" : "size-16",
        )}
      >
        <Icon className="text-primary transition-transform duration-500 group-hover:scale-110" />
      </div>

      <div className={cn("flex flex-col", variant === "compact" ? "gap-0.5" : "gap-1")}>
        <span className="font-semibold text-foreground transition-colors group-hover:text-primary">{title}</span>
        {description && variant !== "compact" && <span className="text-sm text-muted-foreground">{description}</span>}
        {(countLabel ?? count !== undefined) && (
          <span className="text-xs font-medium text-primary/70">{countLabel ?? `${count} items`}</span>
        )}
      </div>

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
    </>
  );

  const classes = cn(
    "group relative flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-6 text-center",
    "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
    "hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(255,45,85,0.1)] hover:-translate-y-1",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    variant === "compact" && "flex-row gap-4 p-4 text-start",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
