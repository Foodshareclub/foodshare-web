"use client";

/**
 * AdminSidebar - Persistent navigation sidebar for admin pages
 * Enhanced with CRM navigation and improved UX
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
  UserCircle,
  Send,
  Target,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "overview",
    items: [
      { href: "/admin", label: "dashboard", icon: LayoutDashboard },
      { href: "/admin/ai-insights", label: "ai_insights", icon: Sparkles },
    ],
  },
  {
    label: "content",
    items: [
      { href: "/admin/listings", label: "listings", icon: ClipboardList },
      { href: "/admin/reports", label: "reports", icon: BarChart3 },
    ],
  },
  {
    label: "crm",
    items: [
      { href: "/admin/crm", label: "customers", icon: UserCircle },
      { href: "/admin/users", label: "users", icon: Users },
    ],
  },
  {
    label: "email_marketing",
    items: [
      { href: "/admin/email", label: "email_crm", icon: Mail },
      { href: "/admin/email/campaigns", label: "campaigns", icon: Send },
      { href: "/admin/email/automation", label: "automation", icon: Workflow },
      { href: "/admin/email/audience", label: "audience", icon: Target },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    // Handle email sub-routes
    if (href.startsWith("/admin/email/")) {
      return pathname === href;
    }
    if (href === "/admin/email") {
      return pathname === "/admin/email";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-background/95 backdrop-blur-sm border-r border-border/50 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Admin</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 hover:bg-muted/80"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(group.label)}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-2",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                      title={collapsed ? t(item.label) : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{t(item.label)}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
              {!collapsed && <Separator className="mt-3 opacity-50" />}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            collapsed && "justify-center px-2",
            "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
          title={collapsed ? t("settings") : undefined}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>{t("settings")}</span>}
        </Link>
      </div>
    </aside>
  );
}
