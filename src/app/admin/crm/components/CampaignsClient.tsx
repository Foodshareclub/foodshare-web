"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Send,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  MailOpen,
  MousePointerClick,
  Users,
  ArrowUpDown,
  Megaphone,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RecentCampaign, EmailDashboardStats } from "@/lib/data/admin-email";

interface CampaignsClientProps {
  campaigns: RecentCampaign[];
  stats: EmailDashboardStats;
}

type SortField = "createdAt" | "sentAt" | "name" | "totalSent";

const STATUS_COLORS = {
  slate: {
    active: "bg-slate-600 text-white",
    inactive: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  blue: {
    active: "bg-blue-600 text-white",
    inactive: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  amber: {
    active: "bg-amber-600 text-white",
    inactive: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  emerald: {
    active: "bg-emerald-600 text-white",
    inactive: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
} as const;

const STAT_COLORS = {
  blue: "bg-blue-500/10 text-blue-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  amber: "bg-amber-500/10 text-amber-600",
} as const;

export function CampaignsClient({ campaigns, stats }: CampaignsClientProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCampaign, setSelectedCampaign] = useState<RecentCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredCampaigns = campaigns
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesType = typeFilter === "all" || c.campaignType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const scheduledCount = campaigns.filter((c) => c.status === "scheduled").length;
  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const sendingCount = campaigns.filter((c) => c.status === "sending").length;

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? "all" : status);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t("total_campaigns")}
              value={campaigns.length.toString()}
              icon={<Megaphone className="h-4 w-4" />}
              color="blue"
            />
            <StatCard
              label={t("emails_sent_30d")}
              value={stats.emailsSent30d.toLocaleString()}
              icon={<Send className="h-4 w-4" />}
              color="emerald"
            />
            <StatCard
              label={t("avg_open_rate")}
              value={`${stats.avgOpenRate}%`}
              icon={<MailOpen className="h-4 w-4" />}
              color="violet"
            />
            <StatCard
              label={t("avg_click_rate")}
              value={`${stats.avgClickRate}%`}
              icon={<MousePointerClick className="h-4 w-4" />}
              color="amber"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={t("draft")}
              count={draftCount}
              color="slate"
              active={statusFilter === "draft"}
              onClick={() => toggleStatusFilter("draft")}
            />
            <StatusPill
              label={t("scheduled")}
              count={scheduledCount}
              color="blue"
              active={statusFilter === "scheduled"}
              onClick={() => toggleStatusFilter("scheduled")}
            />
            <StatusPill
              label={t("sending")}
              count={sendingCount}
              color="amber"
              active={statusFilter === "sending"}
              onClick={() => toggleStatusFilter("sending")}
            />
            <StatusPill
              label={t("sent")}
              count={sentCount}
              color="emerald"
              active={statusFilter === "sent"}
              onClick={() => toggleStatusFilter("sent")}
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_campaigns")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-9 bg-background/50">
                  <SelectValue placeholder={t("type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_types")}</SelectItem>
                  <SelectItem value="newsletter">{t("newsletter")}</SelectItem>
                  <SelectItem value="announcement">{t("announcement")}</SelectItem>
                  <SelectItem value="promotional">{t("promotional")}</SelectItem>
                </SelectContent>
              </Select>
              <SortDropdown
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={(field, order) => {
                  setSortField(field);
                  setSortOrder(order);
                }}
              />
              <Button className="h-9 gap-2" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                {t("new_campaign")}
              </Button>
            </div>
          </div>

          {/* Campaign Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onView={() => setSelectedCampaign(campaign)}
                />
              ))}
            </AnimatePresence>
            {filteredCampaigns.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  icon={<Megaphone className="h-12 w-12" />}
                  title={t("no_campaigns_found")}
                  description={searchQuery ? t("try_different_search") : t("create_first_campaign")}
                  action={
                    <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("create_campaign")}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
      <CreateCampaignDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: keyof typeof STAT_COLORS;
}) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", STAT_COLORS[color])}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: keyof typeof STATUS_COLORS;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active ? STATUS_COLORS[color].active : STATUS_COLORS[color].inactive
      )}
    >
      {label} ({count})
    </button>
  );
}

function SortDropdown({
  sortField: _sortField,
  sortOrder: _sortOrder,
  onSort,
}: {
  sortField: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField, order: "asc" | "desc") => void;
}) {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <ArrowUpDown className="h-4 w-4" />
          {t("sort")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSort("createdAt", "desc")}>
          {t("newest_first")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSort("createdAt", "asc")}>
          {t("oldest_first")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSort("name", "asc")}>{t("name_a_z")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSort("totalSent", "desc")}>
          {t("most_sent")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-muted-foreground/50 mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
}

// ============================================================================
// Campaign Card
// ============================================================================

const CAMPAIGN_STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode }> =
  {
    draft: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-400",
      icon: <FileText className="h-3 w-3" />,
    },
    scheduled: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      icon: <Calendar className="h-3 w-3" />,
    },
    sending: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      icon: <Clock className="h-3 w-3" />,
    },
    sent: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    paused: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      icon: <Pause className="h-3 w-3" />,
    },
    cancelled: {
      bg: "bg-rose-100 dark:bg-rose-900/30",
      text: "text-rose-600 dark:text-rose-400",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

function CampaignCard({ campaign, onView }: { campaign: RecentCampaign; onView: () => void }) {
  const t = useTranslations();
  const config = CAMPAIGN_STATUS_CONFIG[campaign.status] || CAMPAIGN_STATUS_CONFIG.draft;

  const openRate =
    campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : "0";
  const clickRate =
    campaign.totalOpened > 0
      ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1)
      : "0";

  const displayDate = campaign.sentAt
    ? new Date(campaign.sentAt).toLocaleDateString()
    : campaign.scheduledAt
      ? `${t("scheduled")}: ${new Date(campaign.scheduledAt).toLocaleDateString()}`
      : new Date(campaign.createdAt).toLocaleDateString();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:shadow-lg hover:border-border transition-all duration-200"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.subject}</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={cn("text-xs capitalize gap-1", config.bg, config.text)}>
              {config.icon}
              {campaign.status}
            </Badge>
            <CampaignActions onView={onView} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MetricBox value={campaign.totalSent.toLocaleString()} label={t("sent")} />
          <MetricBox value={`${openRate}%`} label={t("opened")} valueColor="text-emerald-600" />
          <MetricBox value={`${clickRate}%`} label={t("clicked")} valueColor="text-blue-600" />
        </div>

        {/* Progress (for sending campaigns) */}
        {campaign.status === "sending" && campaign.totalRecipients > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("progress")}</span>
              <span>{Math.round((campaign.totalSent / campaign.totalRecipients) * 100)}%</span>
            </div>
            <Progress
              value={(campaign.totalSent / campaign.totalRecipients) * 100}
              className="h-1.5"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-3">
          <span className="text-xs text-muted-foreground">{displayDate}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onView}>
            {t("view")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function MetricBox({
  value,
  label,
  valueColor = "text-foreground",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <p className={cn("text-lg font-bold", valueColor)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CampaignActions({ onView }: { onView: () => void }) {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 mr-2" />
          {t("view_details")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="h-4 w-4 mr-2" />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy className="h-4 w-4 mr-2" />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Dialogs
// ============================================================================

function CreateCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create_campaign")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("campaign_name")}</label>
            <Input placeholder={t("enter_campaign_name")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("subject_line")}</label>
            <Input placeholder={t("enter_subject")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("campaign_type")}</label>
            <Select defaultValue="newsletter">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newsletter">{t("newsletter")}</SelectItem>
                <SelectItem value="announcement">{t("announcement")}</SelectItem>
                <SelectItem value="promotional">{t("promotional")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button>{t("create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailDialog({
  campaign,
  open,
  onClose,
}: {
  campaign: RecentCampaign | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();

  if (!campaign) return null;

  const openRate =
    campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : "0";
  const clickRate =
    campaign.totalOpened > 0
      ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1)
      : "0";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {campaign.name}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="performance">{t("performance")}</TabsTrigger>
            <TabsTrigger value="recipients">{t("recipients")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label={t("subject")} value={campaign.subject} />
              <DetailField label={t("type")} value={campaign.campaignType} capitalize />
              <DetailField label={t("status")} value={campaign.status} badge />
              <DetailField
                label={t("created")}
                value={new Date(campaign.createdAt).toLocaleDateString()}
              />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              <PerformanceMetric
                value={campaign.totalRecipients.toLocaleString()}
                label={t("recipients")}
              />
              <PerformanceMetric value={campaign.totalSent.toLocaleString()} label={t("sent")} />
              <PerformanceMetric
                value={`${openRate}%`}
                label={t("open_rate")}
                highlight="emerald"
              />
              <PerformanceMetric value={`${clickRate}%`} label={t("click_rate")} highlight="blue" />
            </div>
          </TabsContent>

          <TabsContent value="recipients" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t("recipients_list_placeholder")}</p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            {t("edit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  capitalize = false,
  badge = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {badge ? (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ) : (
        <p className={cn("text-sm font-medium", capitalize && "capitalize")}>{value}</p>
      )}
    </div>
  );
}

function PerformanceMetric({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: "emerald" | "blue";
}) {
  const bgClass = highlight
    ? highlight === "emerald"
      ? "bg-emerald-500/20"
      : "bg-blue-500/20"
    : "bg-muted/50";
  const textClass = highlight
    ? highlight === "emerald"
      ? "text-emerald-600"
      : "text-blue-600"
    : "text-foreground";

  return (
    <div className={cn("p-3 rounded-lg text-center", bgClass)}>
      <p className={cn("text-2xl font-bold", textClass)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
