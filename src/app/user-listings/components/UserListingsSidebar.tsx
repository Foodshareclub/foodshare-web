"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RefreshCw, Sparkles } from "lucide-react";
import { USER_LISTINGS_COPY } from "./types";

interface UserListingsStatsProps {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  offscreenClass: string;
}

/**
 * Desktop sidebar and mobile summary header for user listings stats.
 */
export function UserListingsSidebar({
  totalCount,
  activeCount,
  inactiveCount,
  isRefreshing,
  onRefresh,
  offscreenClass,
}: UserListingsStatsProps) {
  return (
    <aside
      className={cn(
        "hidden lg:block w-72 xl:w-80 lg:h-[calc(100vh-5rem)] lg:sticky lg:top-20 lg:overflow-hidden p-4 lg:p-6",
        "transform transition-all duration-500",
        offscreenClass,
      )}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300">
        <div className="absolute -top-24 -end-24 h-48 w-48 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-3xl animate-pulse" />

        <div className="relative">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{USER_LISTINGS_COPY.title}</h1>
                <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" aria-hidden="true" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 rounded-lg hover:bg-muted"
                title={USER_LISTINGS_COPY.refreshTitle}
                aria-label={USER_LISTINGS_COPY.refreshTitle}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden="true" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{USER_LISTINGS_COPY.subtitle}</p>
          </div>

          <Separator className="mb-6" />

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-background to-muted/50 p-4 text-center transition-all duration-300 hover:shadow-md">
              <div className="text-2xl font-bold text-foreground tabular-nums">{totalCount}</div>
              <div className="text-xs font-medium text-muted-foreground">{USER_LISTINGS_COPY.statsTotal}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 p-4 text-center transition-all duration-300 hover:shadow-md">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {activeCount}
              </div>
              <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">
                {USER_LISTINGS_COPY.statsActive}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-background to-muted/50 p-4 text-center transition-all duration-300 hover:shadow-md">
              <div className="text-2xl font-bold text-muted-foreground tabular-nums">{inactiveCount}</div>
              <div className="text-xs font-medium text-muted-foreground">{USER_LISTINGS_COPY.statsInactive}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface MobileListingsHeaderProps {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
}

/**
 * Compact mobile header card with listing counts.
 */
export function MobileListingsHeader({ totalCount, activeCount, inactiveCount }: MobileListingsHeaderProps) {
  return (
    <div className="lg:hidden mb-4 p-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            {USER_LISTINGS_COPY.title}
            <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </h1>
          <p className="text-xs text-muted-foreground">{USER_LISTINGS_COPY.mobileSubtitle}</p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {`${totalCount} ${USER_LISTINGS_COPY.totalSuffix}`}
        </Badge>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
          <div className="text-lg font-bold tabular-nums">{totalCount}</div>
          <div className="text-[11px] text-muted-foreground">{USER_LISTINGS_COPY.statsTotal}</div>
        </div>
        <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{activeCount}</div>
          <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
            {USER_LISTINGS_COPY.statsActive}
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
          <div className="text-lg font-bold text-muted-foreground tabular-nums">{inactiveCount}</div>
          <div className="text-[11px] text-muted-foreground">{USER_LISTINGS_COPY.statsInactive}</div>
        </div>
      </div>
    </div>
  );
}
