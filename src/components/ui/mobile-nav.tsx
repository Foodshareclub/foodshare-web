"use client";

import { cn } from "@/lib/utils";
import { Circle, Home, type LucideIcon, Map as MapIcon, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The icons the navigation offers, by name.
 *
 * The items are built in a server component -- the home page -- and the
 * navigation is a client component, because it follows the pathname. A
 * component reference cannot cross that boundary: React refuses to
 * serialise a function, so the page failed to render with "Functions
 * cannot be passed directly to Client Components unless you explicitly
 * expose it by marking it with 'use server'", and the home page's own
 * tests failed with it.
 *
 * So the icon travels as a name and the client component holds the
 * component. The names are data; the icons are code, and code belongs on
 * the side that runs it.
 */
const ICONS: Record<string, LucideIcon> = {
  home: Home,
  map: MapIcon,
  search: Search,
  profile: User,
};

interface MobileNavItem {
  href: string;
  /** The name of an icon in `ICONS`. */
  icon: string;
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
          const Icon = ICONS[item.icon] ?? Circle;

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
