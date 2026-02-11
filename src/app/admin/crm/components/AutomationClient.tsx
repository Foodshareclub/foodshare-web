"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Workflow,
  Search,
  Plus,
  Play,
  MoreHorizontal,
  Zap,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActiveAutomation, EmailDashboardStats } from "@/lib/data/admin-email";

interface AutomationClientProps {
  automations: ActiveAutomation[];
  stats: EmailDashboardStats;
}

export function AutomationClient({ automations, stats: _stats }: AutomationClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAutomations = automations.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = automations.filter((a) => a.status === "active").length;
  const totalEnrolled = automations.reduce((sum, a) => sum + a.totalEnrolled, 0);
  const totalConverted = automations.reduce((sum, a) => sum + a.totalConverted, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Workflow className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{automations.length}</p>
                  <p className="text-xs text-muted-foreground">{t("total_automations")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">{t("active")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEnrolled.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("enrolled")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalConverted.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("conversions")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_automations")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-border/50 bg-background/50 p-0.5">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("all")}
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "active"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("active")}
                </button>
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    statusFilter === "paused"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("paused")}
                </button>
              </div>
              <Button className="h-9 gap-2">
                <Plus className="h-4 w-4" />
                {t("create_automation")}
              </Button>
            </div>
          </div>

          {/* Automations List */}
          <div className="space-y-3">
            {filteredAutomations.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
                <Workflow className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg mb-1">{t("no_automations_found")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("create_first_automation")}</p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("create_automation")}
                </Button>
              </div>
            ) : (
              filteredAutomations.map((automation) => (
                <div
                  key={automation.id}
                  className="rounded-xl border border-border/50 bg-card/50 p-4 hover:bg-card hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{automation.name}</h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs capitalize",
                            automation.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : automation.status === "paused"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {automation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t("trigger")}: {automation.triggerType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {automation.totalEnrolled.toLocaleString()} {t("enrolled")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {automation.totalCompleted.toLocaleString()} {t("completed")}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {automation.conversionRate}% {t("conversion")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={automation.status === "active"} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>{t("edit")}</DropdownMenuItem>
                          <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
                          <DropdownMenuItem>{t("view_analytics")}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
