"use client";

/**
 * AdminSidebar - Persistent navigation sidebar for admin pages
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Mail,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "overview", icon: LayoutDashboard },
  { href: "/admin/listings", label: "listings", icon: ClipboardList },
  { href: "/admin/users", label: "users", icon: Users },
  { href: "/admin/email", label: "email", icon: Mail },
  { href: "/admin/reports", label: "reports", icon: BarChart3 },
  { href: "/admin/ai-insights", label: "ai_insights", icon: Sparkles },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-background border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && <span className="font-semibold text-foreground">Admin</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? t(item.label) : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{t(item.label)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={collapsed ? t("settings") : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>{t("settings")}</span>}
        </Link>
      </div>
    </aside>
  );
}
