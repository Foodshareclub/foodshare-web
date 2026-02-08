"use client";

/**
 * AdminBreadcrumb - Breadcrumb navigation for admin pages
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";

const BREADCRUMB_MAP: Record<string, string> = {
  admin: "overview",
  listings: "listings",
  users: "users",
  email: "email",
  reports: "reports",
  "ai-insights": "ai_insights",
  crm: "crm",
  monitor: "monitor",
  test: "test",
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations();

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = BREADCRUMB_MAP[segment] || segment;
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/admin"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.slice(1).map((item, _index) => (
        <div key={item.href} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.isLast ? (
            <span className="text-foreground font-medium capitalize">{t(item.label)}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors capitalize">
              {t(item.label)}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
