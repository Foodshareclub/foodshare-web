"use client";

import Link from "next/link";
import { ChevronRight, Heart, X } from "lucide-react";
import type { NavItem } from "./navigation-config";
import { accountItems, preferenceItems, supportItems } from "./navigation-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function NavSection({
  title,
  items,
  currentPath,
}: {
  title: string;
  items: NavItem[];
  currentPath: string;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.href;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 cursor-not-allowed"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br opacity-40",
                  item.gradient
                )}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs truncate opacity-60">{item.description}</p>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/80"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm transition-transform duration-200",
                "group-hover:scale-105",
                item.gradient
              )}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{item.label}</span>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground/50 transition-all duration-200",
                "group-hover:text-foreground group-hover:translate-x-0.5",
                isActive && "text-primary"
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}

interface SettingsSidebarProps {
  currentPath: string;
  onClose?: () => void;
}

export function SettingsSidebar({ currentPath, onClose }: SettingsSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {onClose && (
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold">Settings</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <NavSection title="Account" items={accountItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Preferences" items={preferenceItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Support" items={supportItems} currentPath={currentPath} />
      </nav>

      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          FoodShare v1.0 · Made with <Heart className="inline w-3 h-3 text-rose-500 mx-0.5" /> for
          the community
        </p>
      </div>
    </div>
  );
}
