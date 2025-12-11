"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Search, Plus, Tag, UserPlus, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AudienceSegment, EmailDashboardStats } from "@/lib/data/admin-email";

interface AudienceClientProps {
  segments: AudienceSegment[];
  stats: EmailDashboardStats;
}

export function AudienceClient({ segments, stats }: AudienceClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSegments = segments.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSubscribers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("total_subscribers")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeSubscribers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("active")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{segments.length}</p>
                  <p className="text-xs text-muted-foreground">{t("segments")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unsubscribeRate}%</p>
                  <p className="text-xs text-muted-foreground">{t("unsubscribe_rate")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_segments")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Download className="h-4 w-4" />
                {t("export")}
              </Button>
              <Button className="h-9 gap-2">
                <Plus className="h-4 w-4" />
                {t("create_segment")}
              </Button>
            </div>
          </div>

          {/* Segments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSegments.length === 0 ? (
              <div className="col-span-full p-8 text-center">
                <Tag className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg mb-1">{t("no_segments_found")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("create_first_segment")}</p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("create_segment")}
                </Button>
              </div>
            ) : (
              filteredSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-xl border border-border/50 bg-card/50 p-4 hover:bg-card hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <h3 className="font-semibold text-foreground">{segment.name}</h3>
                      {segment.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          {t("system")}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>{t("edit")}</DropdownMenuItem>
                        <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
                        {!segment.isSystem && (
                          <DropdownMenuItem className="text-destructive">
                            {t("delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {segment.description && (
                    <p className="text-sm text-muted-foreground mb-3">{segment.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-sm font-medium">
                      {segment.cachedCount.toLocaleString()} {t("subscribers")}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      {t("view")}
                    </Button>
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
