"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface MobileNavProps {
  items: MobileNavItem[];
  /** Accessible name for the navigation landmark. Required rather than
   * defaulted: a screen reader announces this, and a hardcoded English default
   * would be wrong in all 20 other locales — the same string the `check:i18n-text`
   * guard cannot see, because an attribute is not a text node. */
  label: string;
  className?: string;
}

export function MobileNav({ items, label, className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl backdrop-saturate-150",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      aria-label={label}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary" />
              )}
              <Icon className={cn("size-5 transition-transform duration-300", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
