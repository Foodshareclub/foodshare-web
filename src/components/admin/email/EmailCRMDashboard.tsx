"use client";

/**
 * EmailCRMDashboard - Advanced Email CRM Management Interface
 * Improved version with:
 * - Fixed viewport layout (no horizontal scroll)
 * - Better UX with resizable panels
 * - Enhanced provider management
 * - Newsletter campaign builder
 * - Audience segmentation
 * - Real-time metrics
 */

import React, { useState, useTransition, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Users,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Zap,
  Settings,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Copy,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  MousePointerClick,
  UserPlus,
  UserMinus,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  Globe,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Inbox,
  FileText,
  ArrowUpRight,
  Layers,
  Megaphone,
  Heart,
  Star,
  Mail as _Mail,
} from "lucide-react";
import { useActionToast } from "@/hooks/useActionToast";
import { useEmailTemplates } from "@/hooks/queries/useEmailCRM";
import type { EmailTemplate } from "@/types/automations.types";

// Lazy load the rich text editor to reduce initial bundle size
const RichTextEditor = lazy(() =>
  import("@/components/ui/rich-text-editor").then((mod) => ({ default: mod.RichTextEditor }))
);

// Lazy load the email content editor with visual settings
const EmailContentEditor = lazy(() =>
  import("@/components/admin/email/EmailContentEditor").then((mod) => ({
    default: mod.EmailContentEditor,
  }))
);
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { sendAdminEmail, sendTestEmailDirect } from "@/app/actions/email";
import { refreshEmailDashboard } from "@/app/actions/campaigns";
import type { EmailType } from "@/lib/email/types";
import type {
  EmailCRMData,
  EmailDashboardStats,
  ProviderHealth,
  RecentCampaign,
  ActiveAutomation,
  AudienceSegment,
} from "@/lib/data/admin-email";

// ============================================================================
// Types
// ============================================================================

type TabType = "overview" | "campaigns" | "automation" | "audience" | "compose" | "providers";

interface EmailFormData {
  to: string;
  subject: string;
  message: string;
  emailType: string;
  provider: string;
  useHtml: boolean;
}

interface Props {
  initialData?: EmailCRMData;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Dashboard & metrics",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <Megaphone className="h-4 w-4" />,
    description: "Email campaigns",
  },
  {
    id: "automation",
    label: "Automation",
    icon: <Zap className="h-4 w-4" />,
    description: "Automated flows",
  },
  {
    id: "audience",
    label: "Audience",
    icon: <Users className="h-4 w-4" />,
    description: "Segments & subscribers",
  },
  {
    id: "compose",
    label: "Compose",
    icon: <Send className="h-4 w-4" />,
    description: "Send emails",
  },
  {
    id: "providers",
    label: "Providers",
    icon: <Settings className="h-4 w-4" />,
    description: "Email providers",
  },
];

const EMAIL_TYPES = [
  { value: "newsletter", label: "Newsletter", icon: <FileText className="h-4 w-4" /> },
  { value: "announcement", label: "Announcement", icon: <Megaphone className="h-4 w-4" /> },
  { value: "chat", label: "Chat Notification", icon: <Inbox className="h-4 w-4" /> },
  { value: "food_listing", label: "Food Listing", icon: <Heart className="h-4 w-4" /> },
  { value: "feedback", label: "Feedback Request", icon: <Star className="h-4 w-4" /> },
  { value: "review_reminder", label: "Review Reminder", icon: <Clock className="h-4 w-4" /> },
  { value: "auth", label: "Authentication", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const PROVIDERS = [
  {
    value: "auto",
    label: "Smart Routing",
    description: "Auto-select best provider",
    color: "violet",
  },
  { value: "brevo", label: "Brevo", description: "Primary (300/day)", color: "blue" },
  { value: "resend", label: "Resend", description: "Auth emails (100/day)", color: "emerald" },
  {
    value: "mailersend",
    label: "MailerSend",
    description: "High volume (400/day)",
    color: "green",
  },
  { value: "aws_ses", label: "AWS SES", description: "Failover (100/day)", color: "amber" },
];

// ============================================================================
// Default Stats
// ============================================================================

function getDefaultStats(): EmailDashboardStats {
  return {
    totalSubscribers: 0,
    activeSubscribers: 0,
    emailsSent30d: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 500,
    monthlyQuotaUsed: 0,
    monthlyQuotaLimit: 15000,
    suppressedEmails: 0,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function EmailCRMDashboard({ initialData }: Props) {
  const _t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data state
  const stats = initialData?.stats || getDefaultStats();
  const providerHealth = initialData?.providerHealth || [];
  const campaigns = initialData?.campaigns || [];
  const automations = initialData?.automations || [];
  const segments = initialData?.segments || [];

  // Quota calculations
  const dailyQuotaPercent =
    stats.dailyQuotaLimit > 0
      ? Math.round((stats.dailyQuotaUsed / stats.dailyQuotaLimit) * 100)
      : 0;
  const monthlyQuotaPercent =
    stats.monthlyQuotaLimit > 0
      ? Math.round((stats.monthlyQuotaUsed / stats.monthlyQuotaLimit) * 100)
      : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshEmailDashboard();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
        {/* Header Bar */}
        <header className="flex-shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            {/* Provider Health Pills */}
            <div className="flex items-center gap-2">
              {providerHealth.map((provider) => (
                <ProviderPill key={provider.provider} provider={provider} />
              ))}
              {providerHealth.length === 0 && (
                <>
                  <ProviderPill
                    provider={{
                      provider: "brevo",
                      healthScore: 100,
                      successRate: 100,
                      avgLatencyMs: 0,
                      totalRequests: 0,
                      status: "healthy",
                    }}
                  />
                  <ProviderPill
                    provider={{
                      provider: "resend",
                      healthScore: 100,
                      successRate: 100,
                      avgLatencyMs: 0,
                      totalRequests: 0,
                      status: "healthy",
                    }}
                  />
                </>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Daily Quota Indicator */}
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Daily
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    {stats.dailyQuotaUsed.toLocaleString()}/{stats.dailyQuotaLimit.toLocaleString()}
                  </p>
                </div>
                <div className="w-16">
                  <Progress
                    value={dailyQuotaPercent}
                    className={cn(
                      "h-1.5",
                      dailyQuotaPercent > 90
                        ? "[&>div]:bg-rose-500"
                        : dailyQuotaPercent > 70
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>
              </div>

              {/* Monthly Quota Indicator */}
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Monthly
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    {stats.monthlyQuotaUsed.toLocaleString()}/
                    {stats.monthlyQuotaLimit.toLocaleString()}
                  </p>
                </div>
                <div className="w-16">
                  <Progress
                    value={monthlyQuotaPercent}
                    className={cn(
                      "h-1.5",
                      monthlyQuotaPercent > 90
                        ? "[&>div]:bg-rose-500"
                        : monthlyQuotaPercent > 70
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Refresh Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>

              {/* Create Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setActiveTab("compose")}>
                    <Send className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">New Email</p>
                      <p className="text-xs text-muted-foreground">Send a single email</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("campaigns")}>
                    <Megaphone className="h-4 w-4 mr-2 text-blue-500" />
                    <div>
                      <p className="font-medium">New Campaign</p>
                      <p className="text-xs text-muted-foreground">Bulk email campaign</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("automation")}>
                    <Zap className="h-4 w-4 mr-2 text-amber-500" />
                    <div>
                      <p className="font-medium">New Automation</p>
                      <p className="text-xs text-muted-foreground">Automated email flow</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("audience")}>
                    <Target className="h-4 w-4 mr-2 text-violet-500" />
                    <div>
                      <p className="font-medium">New Segment</p>
                      <p className="text-xs text-muted-foreground">Audience segment</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
              <TabsList className="bg-transparent h-auto p-0 gap-0">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "relative gap-2 px-4 py-2.5 rounded-none border-b-2 border-transparent",
                      "data-[state=active]:bg-transparent data-[state=active]:border-primary",
                      "data-[state=active]:shadow-none hover:bg-muted/50 transition-colors"
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-5">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <TabPanel key="overview">
                  <OverviewTab
                    stats={stats}
                    campaigns={campaigns}
                    automations={automations}
                    providerHealth={providerHealth}
                  />
                </TabPanel>
              )}
              {activeTab === "campaigns" && (
                <TabPanel key="campaigns">
                  <CampaignsTab campaigns={campaigns} />
                </TabPanel>
              )}
              {activeTab === "automation" && (
                <TabPanel key="automation">
                  <AutomationTab automations={automations} />
                </TabPanel>
              )}
              {activeTab === "audience" && (
                <TabPanel key="audience">
                  <AudienceTab segments={segments} stats={stats} />
                </TabPanel>
              )}
              {activeTab === "compose" && (
                <TabPanel key="compose">
                  <ComposeTab />
                </TabPanel>
              )}
              {activeTab === "providers" && (
                <TabPanel key="providers">
                  <ProvidersTab providerHealth={providerHealth} />
                </TabPanel>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Tab Panel Wrapper
// ============================================================================

function TabPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Provider Pill Component
// ============================================================================

function ProviderPill({ provider }: { provider: ProviderHealth }) {
  const statusConfig = {
    healthy: {
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    degraded: {
      bg: "bg-amber-500/10 hover:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    down: {
      bg: "bg-rose-500/10 hover:bg-rose-500/20",
      text: "text-rose-700 dark:text-rose-400",
      dot: "bg-rose-500",
    },
  };

  const providerNames: Record<string, string> = {
    brevo: "Brevo",
    resend: "Resend",
    mailersend: "MailerSend",
    aws_ses: "AWS",
  };

  const config = statusConfig[provider.status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            config.bg,
            config.text
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dot)} />
          {providerNames[provider.provider]}
          <span className="opacity-70">{provider.successRate}%</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{providerNames[provider.provider]}</p>
        <p className="text-muted-foreground">
          {provider.totalRequests.toLocaleString()} requests • {provider.avgLatencyMs}ms avg
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  stats,
  campaigns,
  automations,
  providerHealth,
}: {
  stats: EmailDashboardStats;
  campaigns: RecentCampaign[];
  automations: ActiveAutomation[];
  providerHealth: ProviderHealth[];
}) {
  return (
    <div className="space-y-5">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          subValue={`${stats.activeSubscribers.toLocaleString()} active`}
          icon={<Users className="h-5 w-5" />}
          trend="up"
          color="blue"
        />
        <MetricCard
          label="Emails Sent (30d)"
          value={stats.emailsSent30d.toLocaleString()}
          icon={<Send className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Open Rate"
          value={`${stats.avgOpenRate}%`}
          subValue="vs 21% industry avg"
          icon={<Eye className="h-5 w-5" />}
          trend={stats.avgOpenRate > 21 ? "up" : "down"}
          color="violet"
        />
        <MetricCard
          label="Click Rate"
          value={`${stats.avgClickRate}%`}
          subValue="vs 2.5% industry avg"
          icon={<MousePointerClick className="h-5 w-5" />}
          trend={stats.avgClickRate > 2.5 ? "up" : "down"}
          color="amber"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Recent Campaigns - Takes 3 columns */}
        <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Recent Campaigns
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {campaigns.slice(0, 4).map((campaign) => (
                <CampaignListItem key={campaign.id} campaign={campaign} />
              ))}
              {campaigns.length === 0 && (
                <EmptyState
                  icon={<Megaphone className="h-8 w-8" />}
                  title="No campaigns yet"
                  description="Create your first email campaign"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Automations - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Active Automations
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {automations.slice(0, 4).map((automation) => (
                <AutomationListItem key={automation.id} automation={automation} />
              ))}
              {automations.length === 0 && (
                <EmptyState
                  icon={<Zap className="h-8 w-8" />}
                  title="No automations"
                  description="Set up automated email flows"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Provider Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(providerHealth.length > 0
              ? providerHealth
              : [
                  {
                    provider: "brevo" as const,
                    healthScore: 100,
                    successRate: 100,
                    avgLatencyMs: 0,
                    totalRequests: 0,
                    status: "healthy" as const,
                  },
                  {
                    provider: "resend" as const,
                    healthScore: 100,
                    successRate: 100,
                    avgLatencyMs: 0,
                    totalRequests: 0,
                    status: "healthy" as const,
                  },
                  {
                    provider: "mailersend" as const,
                    healthScore: 100,
                    successRate: 100,
                    avgLatencyMs: 0,
                    totalRequests: 0,
                    status: "healthy" as const,
                  },
                  {
                    provider: "aws_ses" as const,
                    healthScore: 100,
                    successRate: 100,
                    avgLatencyMs: 0,
                    totalRequests: 0,
                    status: "healthy" as const,
                  },
                ]
            ).map((provider) => (
              <ProviderPerformanceCard key={provider.provider} provider={provider} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Campaigns Tab
// ============================================================================

function CampaignsTab({ campaigns }: { campaigns: RecentCampaign[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-card/50">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sending">Sending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border/50 rounded-lg p-0.5 bg-muted/30">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new email campaign to reach your audience
                </DialogDescription>
              </DialogHeader>
              <CampaignForm onClose={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaign List/Grid */}
      {viewMode === "list" ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Click Rate
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCampaigns.map((campaign) => (
                  <CampaignTableRow key={campaign.id} campaign={campaign} />
                ))}
              </tbody>
            </table>
          </div>
          {filteredCampaigns.length === 0 && (
            <div className="p-12">
              <EmptyState
                icon={<Megaphone className="h-10 w-10" />}
                title="No campaigns found"
                description={
                  searchQuery ? "Try adjusting your search" : "Create your first campaign"
                }
              />
            </div>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full">
              <Card className="p-12 bg-card/50">
                <EmptyState
                  icon={<Megaphone className="h-10 w-10" />}
                  title="No campaigns found"
                  description={
                    searchQuery ? "Try adjusting your search" : "Create your first campaign"
                  }
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Automation Tab
// ============================================================================

function AutomationTab({ automations }: { automations: ActiveAutomation[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ActiveAutomation | null>(null);
  const [_refreshKey, setRefreshKey] = useState(0);

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = (): void => {
    setRefreshKey((k) => k + 1);
    // Trigger page revalidation
    refreshEmailDashboard();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <AutomationBuilderLazy
              flow={
                editingFlow
                  ? {
                      id: editingFlow.id,
                      name: editingFlow.name,
                      description: null,
                      trigger_type: editingFlow.triggerType,
                      trigger_config: {},
                      status: editingFlow.status,
                      steps: [],
                      total_enrolled: editingFlow.totalEnrolled,
                      total_completed: editingFlow.totalCompleted,
                      total_converted: 0,
                      conversion_goal: null,
                      created_by: null,
                      created_at: "",
                      updated_at: "",
                    }
                  : undefined
              }
              onClose={() => {
                setShowBuilder(false);
                setEditingFlow(null);
              }}
              onSave={handleRefresh}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Automation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAutomations.map((automation) => (
          <AutomationCardEnhanced
            key={automation.id}
            automation={automation}
            onEdit={() => {
              setEditingFlow(automation);
              setShowBuilder(true);
            }}
          />
        ))}
        {filteredAutomations.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12 bg-card/50">
              <EmptyState
                icon={<Zap className="h-10 w-10" />}
                title="No automations yet"
                description="Create automated email flows to engage your users"
                action={
                  <Button className="mt-4 gap-2" onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4" />
                    Create Automation
                  </Button>
                }
              />
            </Card>
          </div>
        )}
      </div>

      {/* Quick Start Templates */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Quick Start Templates
          </CardTitle>
          <CardDescription>Pre-built automation flows to get you started</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <PresetAutomationCreatorLazy onCreated={handleRefresh} />
        </CardContent>
      </Card>

      {/* Queue Control */}
      <QueueControlCard onRefresh={handleRefresh} />
    </div>
  );
}

// Lazy load AutomationBuilder
const AutomationBuilderLazy = React.lazy(() =>
  import("./AutomationBuilder").then((mod) => ({ default: mod.AutomationBuilder }))
);

// Lazy load PresetAutomationCreator
const PresetAutomationCreatorLazy = React.lazy(() =>
  import("./AutomationBuilder").then((mod) => ({ default: mod.PresetAutomationCreator }))
);

// ============================================================================
// Queue Control Card - Admin controls for automation queue
// ============================================================================

function QueueControlCard({ onRefresh }: { onRefresh: () => void }): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"process" | "cancel" | "retry" | null>(null);
  const [queueStats, setQueueStats] = useState<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  } | null>(null);
  const toast = useActionToast();

  // Load queue stats on mount
  React.useEffect(() => {
    const loadStats = async (): Promise<void> => {
      const { getQueueStatus } = await import("@/app/actions/automations");
      const result = await getQueueStatus();
      if (result.success) {
        setQueueStats(result.data);
      }
    };
    loadStats();
  }, []);

  const handleProcessNow = (): void => {
    setActionType("process");
    startTransition(async () => {
      const { triggerQueueProcessing } = await import("@/app/actions/automations");
      const result = await triggerQueueProcessing();
      if (result.success) {
        toast.success("Queue processed", result.data.message);
        // Reload stats
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Processing failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  const handleCancelPending = (): void => {
    if (!confirm("Cancel all pending automation emails? This cannot be undone.")) return;
    setActionType("cancel");
    startTransition(async () => {
      const { cancelPendingEmails } = await import("@/app/actions/automations");
      const result = await cancelPendingEmails();
      if (result.success) {
        toast.success("Emails cancelled", `${result.data.cancelled} pending emails cancelled`);
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Cancel failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  const handleRetryFailed = (): void => {
    setActionType("retry");
    startTransition(async () => {
      const { retryFailedEmails } = await import("@/app/actions/automations");
      const result = await retryFailedEmails();
      if (result.success) {
        toast.success("Emails queued for retry", `${result.data.retried} emails will be retried`);
        const { getQueueStatus } = await import("@/app/actions/automations");
        const statsResult = await getQueueStatus();
        if (statsResult.success) setQueueStats(statsResult.data);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Retry failed", errorMsg);
      }
      onRefresh();
      setActionType(null);
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Queue Control
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Cron: Every 5 min
          </Badge>
        </div>
        <CardDescription>Manage the automation email queue</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Queue Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {queueStats?.pending ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {queueStats?.processing ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Processing</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {queueStats?.sent ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Sent</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10">
            <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {queueStats?.failed ?? "-"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleProcessNow}
                disabled={isPending}
              >
                {actionType === "process" ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Process Now
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manually trigger queue processing</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRetryFailed}
                disabled={isPending || !queueStats?.failed}
              >
                {actionType === "retry" ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry Failed
              </Button>
            </TooltipTrigger>
            <TooltipContent>Retry all failed emails</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                onClick={handleCancelPending}
                disabled={isPending || !queueStats?.pending}
              >
                {actionType === "cancel" ? (
                  <div className="h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancel Pending
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel all pending emails</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Automation Card with full CRUD functionality
function AutomationCardEnhanced({
  automation,
  onEdit,
}: {
  automation: ActiveAutomation;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"toggle" | "delete" | "duplicate" | null>(null);
  const toast = useActionToast();

  const statusConfig = {
    draft: {
      color: "border-slate-500/30",
      dot: "bg-slate-500",
      label: "Draft",
      bg: "bg-slate-500/5",
    },
    active: {
      color: "border-emerald-500/30",
      dot: "bg-emerald-500 animate-pulse",
      label: "Active",
      bg: "bg-emerald-500/5",
    },
    paused: {
      color: "border-amber-500/30",
      dot: "bg-amber-500",
      label: "Paused",
      bg: "bg-amber-500/5",
    },
    archived: {
      color: "border-slate-400/30",
      dot: "bg-slate-400",
      label: "Archived",
      bg: "bg-slate-400/5",
    },
  };

  const config = statusConfig[automation.status];

  const handleToggleStatus = (): void => {
    setActionType("toggle");
    startTransition(async () => {
      const { toggleAutomationStatus } = await import("@/app/actions/automations");
      const newStatus = automation.status === "active" ? "paused" : "active";
      const result = await toggleAutomationStatus(automation.id, newStatus);
      if (result.success) {
        toast.success(
          newStatus === "active" ? "Automation activated" : "Automation paused",
          result.data.message
        );
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to update status", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  const handleDuplicate = (): void => {
    setActionType("duplicate");
    startTransition(async () => {
      const { duplicateAutomation } = await import("@/app/actions/automations");
      const result = await duplicateAutomation(automation.id);
      if (result.success) {
        toast.success("Automation duplicated", `Created "${result.data.name}"`);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to duplicate", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  const handleDelete = (): void => {
    if (
      !confirm(
        `Are you sure you want to archive "${automation.name}"? This will stop all pending emails.`
      )
    ) {
      return;
    }
    setActionType("delete");
    startTransition(async () => {
      const { deleteAutomationFlow } = await import("@/app/actions/automations");
      const result = await deleteAutomationFlow(automation.id);
      if (result.success) {
        toast.success("Automation archived", "All pending emails have been cancelled");
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to archive", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  const isLoading = isPending && actionType !== null;

  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur-sm border hover:shadow-md transition-all",
        config.color,
        config.bg,
        isLoading && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", config.dot)} />
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleStatus}
                  disabled={isLoading || automation.status === "archived"}
                >
                  {isPending && actionType === "toggle" ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : automation.status === "active" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {automation.status === "active" ? "Pause automation" : "Activate automation"}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLoading}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
                  {actionType === "duplicate" ? (
                    <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {actionType === "delete" ? (
                    <div className="h-4 w-4 mr-2 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h4 className="font-semibold text-sm mb-1">{automation.name}</h4>
        <p className="text-xs text-muted-foreground mb-4 capitalize">
          Trigger: {automation.triggerType.replace(/_/g, " ")}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalEnrolled.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Enrolled</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalCompleted.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{automation.conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Conversion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Audience Tab
// ============================================================================

function AudienceTab({
  segments,
  stats,
}: {
  segments: AudienceSegment[];
  stats: EmailDashboardStats;
}) {
  return (
    <div className="space-y-5">
      {/* Audience Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          label="Active"
          value={stats.activeSubscribers.toLocaleString()}
          icon={<UserPlus className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Unsubscribed (30d)"
          value={Math.round(
            (stats.totalSubscribers * stats.unsubscribeRate) / 100
          ).toLocaleString()}
          icon={<UserMinus className="h-5 w-5" />}
          color="rose"
        />
        <MetricCard
          label="Growth Rate"
          value={`+${Math.max(0, 100 - stats.unsubscribeRate).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="violet"
        />
      </div>

      {/* Segments */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Audience Segments
              </CardTitle>
              <CardDescription>Target specific groups with personalized content</CardDescription>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <SegmentCard key={segment.id} segment={segment} />
            ))}
            {segments.length === 0 && (
              <div className="col-span-full py-8">
                <EmptyState
                  icon={<Target className="h-10 w-10" />}
                  title="No segments created"
                  description="Create segments to target specific audiences"
                  action={
                    <Button className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Create Segment
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Segments */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Segments</CardTitle>
          <CardDescription>Auto-generated segments based on user behavior</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-4">
            <SystemSegmentCard
              name="All Subscribers"
              count={stats.totalSubscribers}
              icon={<Users className="h-4 w-4" />}
              color="blue"
            />
            <SystemSegmentCard
              name="Active Users"
              count={stats.activeSubscribers}
              icon={<Activity className="h-4 w-4" />}
              color="emerald"
            />
            <SystemSegmentCard
              name="New (7 days)"
              count={Math.round(stats.totalSubscribers * 0.05)}
              icon={<UserPlus className="h-4 w-4" />}
              color="violet"
            />
            <SystemSegmentCard
              name="Engaged"
              count={Math.round((stats.totalSubscribers * stats.avgOpenRate) / 100)}
              icon={<Heart className="h-4 w-4" />}
              color="amber"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Rich Text Editor Wrapper (Lazy Loaded)
// ============================================================================

function RichTextEditorLazy({
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-xl border border-border/50 bg-background/50 animate-pulse"
          style={{ minHeight: minHeight || "300px" }}
        >
          <div className="p-2 border-b border-border/50 bg-muted/30">
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-8 w-8 rounded bg-muted" />
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="h-4 w-3/4 bg-muted rounded mb-2" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
      }
    >
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
      />
    </Suspense>
  );
}

// EmailPreview is now replaced by EmailContentEditor from ./EmailContentEditor

// ============================================================================
// Compose Tab
// ============================================================================

function ComposeTab() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "newsletter",
    provider: "auto",
    useHtml: true, // Default to rich editor
  });
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field: keyof EmailFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await sendAdminEmail({
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        useHtml: true,
        emailType: formData.emailType as EmailType,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `Email sent! ID: ${response.data?.messageId}`,
        });
        setFormData({
          to: "",
          subject: "",
          message: "",
          emailType: "newsletter",
          provider: "auto",
          useHtml: true,
        });
      } else {
        setResult({ success: false, message: response.error.message });
      }
    });
  };

  const handleTestSend = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      setResult({ success: false, message: "Please fill in all required fields" });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const response = await sendTestEmailDirect(formData.to, formData.subject, formData.message);
      if (response.success) {
        setResult({
          success: true,
          message: `Test email sent! ID: ${response.data.messageId}`,
        });
      } else {
        setResult({ success: false, message: `Test failed: ${response.error.message}` });
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* Email Form */}
      <div className="lg:col-span-2 space-y-5">
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border-border/50 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Compose Email</CardTitle>
                  <CardDescription>Create and send beautiful emails</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {showPreview ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                }
              >
                <EmailContentEditor
                  to={formData.to}
                  subject={formData.subject}
                  html={formData.message}
                  onClose={() => setShowPreview(false)}
                />
              </Suspense>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Recipient & Subject Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="to" className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Recipient
                    </Label>
                    <Input
                      id="to"
                      type="email"
                      value={formData.to}
                      onChange={(e) => handleChange("to", e.target.value)}
                      placeholder="user@example.com"
                      className="bg-background/50 h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="subject"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Subject Line
                    </Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      placeholder="Your email subject..."
                      className="bg-background/50 h-11"
                      required
                    />
                  </div>
                </div>

                {/* Type & Provider Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      Email Type
                    </Label>
                    <Select
                      value={formData.emailType}
                      onValueChange={(value) => handleChange("emailType", value)}
                    >
                      <SelectTrigger className="bg-background/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMAIL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{type.icon}</span>
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Provider
                    </Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) => handleChange("provider", value)}
                    >
                      <SelectTrigger className="bg-background/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  provider.value === "auto" && "bg-violet-500",
                                  provider.value === "brevo" && "bg-blue-500",
                                  provider.value === "resend" && "bg-emerald-500",
                                  provider.value === "mailersend" && "bg-green-500",
                                  provider.value === "aws_ses" && "bg-amber-500"
                                )}
                              />
                              <span>{provider.label}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {provider.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rich Text Editor */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    Email Content
                  </Label>
                  <RichTextEditorLazy
                    value={formData.message}
                    onChange={(html) => handleChange("message", html)}
                    placeholder="Start writing your email..."
                    minHeight="280px"
                  />
                </div>

                {/* Result */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl flex items-center gap-3",
                      result.success
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p className="font-medium text-sm">{result.message}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 gap-2 h-11 shadow-lg shadow-primary/20"
                  >
                    <Send className="h-4 w-4" />
                    {isPending ? "Sending..." : "Send Email"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={handleTestSend}
                    className="gap-2 h-11"
                  >
                    <Eye className="h-4 w-4" />
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setFormData({
                        to: "",
                        subject: "",
                        message: "",
                        emailType: "newsletter",
                        provider: "auto",
                        useHtml: true,
                      });
                      setResult(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Smart Routing Info */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              Smart Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-blue-700/80 dark:text-blue-400/80 space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                <span>Auto-select uses quota-aware routing</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-600">B</span>
                </div>
                <span>Brevo: Primary for notifications</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-600">R</span>
                </div>
                <span>Resend: Prioritized for auth emails</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-amber-600">A</span>
                </div>
                <span>AWS SES: High-volume failover</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Quick Templates - Now fetched from database */}
        <EmailTemplatesPanel
          onSelectTemplate={(template) => {
            setFormData((prev) => ({
              ...prev,
              subject: template.subject,
              message: template.html_content,
              emailType: template.category === "automation" ? "newsletter" : template.category,
            }));
          }}
        />

        {/* Character Count */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Content Length</span>
              <span className="font-mono tabular-nums">
                {formData.message.length.toLocaleString()} chars
              </span>
            </div>
            <Progress
              value={Math.min((formData.message.length / 10000) * 100, 100)}
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Providers Tab
// ============================================================================

function ProvidersTab({ providerHealth }: { providerHealth: ProviderHealth[] }) {
  const providers =
    providerHealth.length > 0
      ? providerHealth
      : [
          {
            provider: "brevo" as const,
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy" as const,
          },
          {
            provider: "resend" as const,
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy" as const,
          },
          {
            provider: "aws_ses" as const,
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy" as const,
          },
        ];

  return (
    <div className="space-y-5">
      {/* Provider Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {providers.map((provider) => (
          <ProviderDetailCard key={provider.provider} provider={provider} />
        ))}
      </div>

      {/* Configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Provider Configuration
          </CardTitle>
          <CardDescription>Manage email provider settings and priorities</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProviderConfigCard
              name="Brevo"
              status="configured"
              dailyLimit={300}
              priority={1}
              description="Primary provider for app notifications and newsletters"
            />
            <ProviderConfigCard
              name="Resend"
              status="configured"
              dailyLimit={100}
              priority={2}
              description="Optimized for authentication and transactional emails"
            />
            <ProviderConfigCard
              name="MailerSend"
              status="configured"
              dailyLimit={400}
              priority={3}
              description="High-volume email provider with 12,000 emails/month free tier"
            />
            <ProviderConfigCard
              name="AWS SES"
              status="configured"
              dailyLimit={100}
              priority={4}
              description="Failover provider when primary quotas are exhausted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Routing Rules */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Smart Routing Rules
          </CardTitle>
          <CardDescription>Automatic email routing based on type and availability</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <RoutingRule condition="Email type = auth" action="Route to Resend" priority="High" />
          <RoutingRule
            condition="Email type = newsletter"
            action="Route to Brevo"
            priority="Normal"
          />
          <RoutingRule
            condition="Primary quota exhausted"
            action="Failover to AWS SES"
            priority="Fallback"
          />
          <RoutingRule
            condition="All quotas exhausted"
            action="Queue for next day"
            priority="Last resort"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

// MetricCard - Displays a single metric with icon and optional trend
function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
  color = "blue",
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500" />}
                {subValue}
              </p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", colorClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// EmptyState - Placeholder for empty lists
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <div className="text-muted-foreground/50 mb-3">{icon}</div>
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>}
      {action}
    </div>
  );
}

// CampaignListItem - Compact campaign row for overview
function CampaignListItem({ campaign }: { campaign: RecentCampaign }) {
  const statusConfig = {
    draft: { color: "bg-slate-500", label: "Draft" },
    scheduled: { color: "bg-blue-500", label: "Scheduled" },
    sending: { color: "bg-amber-500 animate-pulse", label: "Sending" },
    sent: { color: "bg-emerald-500", label: "Sent" },
    paused: { color: "bg-orange-500", label: "Paused" },
    cancelled: { color: "bg-rose-500", label: "Cancelled" },
  };

  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", config.color)} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium tabular-nums">{openRate}%</p>
          <p className="text-xs text-muted-foreground">open rate</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {config.label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// CampaignTableRow - Full table row for campaigns list
function CampaignTableRow({ campaign }: { campaign: RecentCampaign }) {
  const statusConfig = {
    draft: {
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      label: "Draft",
    },
    scheduled: {
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      label: "Scheduled",
    },
    sending: {
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      label: "Sending",
    },
    sent: {
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      label: "Sent",
    },
    paused: {
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      label: "Paused",
    },
    cancelled: {
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      label: "Cancelled",
    },
  };

  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;
  const clickRate =
    campaign.totalOpened > 0 ? Math.round((campaign.totalClicked / campaign.totalOpened) * 100) : 0;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div>
          <p className="font-medium text-sm">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
        </div>
      </td>
      <td className="p-3">
        <Badge className={cn("text-xs font-medium", config.color)}>{config.label}</Badge>
      </td>
      <td className="p-3 text-sm tabular-nums">{campaign.totalRecipients.toLocaleString()}</td>
      <td className="p-3 text-sm tabular-nums">{openRate}%</td>
      <td className="p-3 text-sm tabular-nums">{clickRate}%</td>
      <td className="p-3 text-sm text-muted-foreground">
        {campaign.sentAt
          ? new Date(campaign.sentAt).toLocaleDateString()
          : campaign.scheduledAt
            ? new Date(campaign.scheduledAt).toLocaleDateString()
            : "—"}
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {campaign.status === "draft" && (
              <DropdownMenuItem>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// CampaignCard - Grid card view for campaigns
function CampaignCard({ campaign }: { campaign: RecentCampaign }) {
  const statusConfig = {
    draft: { color: "border-slate-500/30 bg-slate-500/5", dot: "bg-slate-500", label: "Draft" },
    scheduled: {
      color: "border-blue-500/30 bg-blue-500/5",
      dot: "bg-blue-500",
      label: "Scheduled",
    },
    sending: {
      color: "border-amber-500/30 bg-amber-500/5",
      dot: "bg-amber-500 animate-pulse",
      label: "Sending",
    },
    sent: { color: "border-emerald-500/30 bg-emerald-500/5", dot: "bg-emerald-500", label: "Sent" },
    paused: {
      color: "border-orange-500/30 bg-orange-500/5",
      dot: "bg-orange-500",
      label: "Paused",
    },
    cancelled: {
      color: "border-rose-500/30 bg-rose-500/5",
      dot: "bg-rose-500",
      label: "Cancelled",
    },
  };

  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;

  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur-sm border hover:shadow-md transition-all",
        config.color
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", config.dot)} />
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{campaign.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{campaign.subject}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {campaign.totalRecipients.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Recipients</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{openRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Open Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {campaign.totalClicked.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// CampaignForm - Create/edit campaign dialog form
function CampaignForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign Name</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Newsletter"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-subject">Subject Line</Label>
        <Input
          id="campaign-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., This week on FoodShare..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-content">Email Content</Label>
        <Textarea
          id="campaign-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your email content..."
          rows={6}
        />
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Create Campaign</Button>
      </DialogFooter>
    </div>
  );
}

// AutomationListItem - Compact automation row for overview
function AutomationListItem({ automation }: { automation: ActiveAutomation }) {
  const statusConfig = {
    draft: { color: "bg-slate-500", label: "Draft" },
    active: { color: "bg-emerald-500 animate-pulse", label: "Active" },
    paused: { color: "bg-amber-500", label: "Paused" },
    archived: { color: "bg-slate-400", label: "Archived" },
  };

  const config = statusConfig[automation.status];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", config.color)} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{automation.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {automation.triggerType.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium tabular-nums">
            {automation.totalEnrolled.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">enrolled</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          {automation.status === "active" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// AutomationCard - Full card for automation grid (reserved for future use)
function _AutomationCard({ automation }: { automation: ActiveAutomation }) {
  const statusConfig = {
    draft: {
      color: "border-slate-500/30",
      dot: "bg-slate-500",
      label: "Draft",
      bg: "bg-slate-500/5",
    },
    active: {
      color: "border-emerald-500/30",
      dot: "bg-emerald-500 animate-pulse",
      label: "Active",
      bg: "bg-emerald-500/5",
    },
    paused: {
      color: "border-amber-500/30",
      dot: "bg-amber-500",
      label: "Paused",
      bg: "bg-amber-500/5",
    },
    archived: {
      color: "border-slate-400/30",
      dot: "bg-slate-400",
      label: "Archived",
      bg: "bg-slate-400/5",
    },
  };

  const config = statusConfig[automation.status];

  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur-sm border hover:shadow-md transition-all",
        config.color,
        config.bg
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", config.dot)} />
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {automation.status === "active" ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h4 className="font-semibold text-sm mb-1">{automation.name}</h4>
        <p className="text-xs text-muted-foreground mb-4 capitalize">
          Trigger: {automation.triggerType.replace(/_/g, " ")}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalEnrolled.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Enrolled</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalCompleted.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{automation.conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Conversion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// AutomationTemplate - Quick start template card (reserved for future use)
function _AutomationTemplate({
  name,
  description,
  trigger,
  icon,
}: {
  name: string;
  description: string;
  trigger: string;
  icon: React.ReactNode;
}) {
  return (
    <button className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group">
      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        <Badge variant="secondary" className="mt-2 text-[10px]">
          <Zap className="h-3 w-3 mr-1" />
          {trigger}
        </Badge>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
}

// SegmentCard - Audience segment card
function SegmentCard({ segment }: { segment: AudienceSegment }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${segment.color}20`, color: segment.color }}
          >
            <Users className="h-4 w-4" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Send className="h-4 w-4 mr-2" />
                Send Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="font-semibold text-sm mb-1">{segment.name}</h4>
        {segment.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{segment.description}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tabular-nums">{segment.cachedCount.toLocaleString()}</p>
          <Badge variant="secondary" className="text-xs">
            {segment.isSystem ? "System" : "Custom"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// SystemSegmentCard - Pre-defined system segment
function SystemSegmentCard({
  name,
  count,
  icon,
  color,
}: {
  name: string;
  count: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <button
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm",
        colorClasses[color]
      )}
    >
      <div className="p-2 rounded-lg bg-current/10">{icon}</div>
      <div className="text-left">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-lg font-bold tabular-nums">{count.toLocaleString()}</p>
      </div>
    </button>
  );
}

// ProviderPerformanceCard - Compact provider stats for overview
function ProviderPerformanceCard({ provider }: { provider: ProviderHealth }) {
  const providerConfig = {
    brevo: { name: "Brevo", color: "blue", description: "Primary notifications" },
    resend: { name: "Resend", color: "emerald", description: "Auth & transactional" },
    mailersend: { name: "MailerSend", color: "green", description: "High volume emails" },
    aws_ses: { name: "AWS SES", color: "amber", description: "Failover provider" },
  };

  const config = providerConfig[provider.provider];
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    green: "bg-green-500/10 border-green-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        colorClasses[config.color as keyof typeof colorClasses]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{config.name}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            provider.status === "healthy"
              ? "bg-emerald-500"
              : provider.status === "degraded"
                ? "bg-amber-500"
                : "bg-rose-500"
          )}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums">{provider.successRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase">Success</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums">{provider.avgLatencyMs}ms</p>
          <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums">
            {provider.totalRequests.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">Requests</p>
        </div>
      </div>
    </div>
  );
}

// ProviderDetailCard - Full provider card for providers tab
function ProviderDetailCard({ provider }: { provider: ProviderHealth }) {
  const providerConfig = {
    brevo: {
      name: "Brevo",
      color: "blue",
      limit: 300,
      description: "Primary email provider for notifications and newsletters",
    },
    resend: {
      name: "Resend",
      color: "emerald",
      limit: 100,
      description: "Optimized for authentication and transactional emails",
    },
    mailersend: {
      name: "MailerSend",
      color: "green",
      limit: 400,
      description: "High-volume email provider with 12,000 emails/month free tier",
    },
    aws_ses: {
      name: "AWS SES",
      color: "amber",
      limit: 100,
      description: "High-volume failover when primary quotas exhausted",
    },
  };

  const config = providerConfig[provider.provider];
  const statusConfig = {
    healthy: {
      label: "Healthy",
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    degraded: {
      label: "Degraded",
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    down: {
      label: "Down",
      color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
  };

  const status = statusConfig[provider.status];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-lg">{config.name}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
        </div>

        <div className="space-y-4">
          {/* Health Score */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Health Score</span>
              <span className="font-medium">{provider.healthScore}%</span>
            </div>
            <Progress
              value={provider.healthScore}
              className={cn(
                "h-2",
                provider.healthScore >= 80
                  ? "[&>div]:bg-emerald-500"
                  : provider.healthScore >= 50
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-rose-500"
              )}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold tabular-nums">{provider.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold tabular-nums">{provider.avgLatencyMs}ms</p>
              <p className="text-xs text-muted-foreground">Avg Latency</p>
            </div>
          </div>

          {/* Daily Limit */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground">Daily Limit</span>
            <span className="font-medium">{config.limit} emails/day</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ProviderConfigCard - Configuration card for providers
function ProviderConfigCard({
  name,
  status,
  dailyLimit,
  priority,
  description,
}: {
  name: string;
  status: "configured" | "not_configured" | "error";
  dailyLimit: number;
  priority: number;
  description: string;
}) {
  const statusConfig = {
    configured: {
      label: "Configured",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    not_configured: {
      label: "Not Configured",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-amber-600 dark:text-amber-400",
    },
    error: {
      label: "Error",
      icon: <XCircle className="h-4 w-4" />,
      color: "text-rose-600 dark:text-rose-400",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Priority {priority}
        </Badge>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className={cn("flex items-center gap-1.5 text-sm", config.color)}>
          {config.icon}
          {config.label}
        </div>
        <span className="text-sm text-muted-foreground">{dailyLimit}/day</span>
      </div>
    </div>
  );
}

// RoutingRule - Smart routing rule display
function RoutingRule({
  condition,
  action,
  priority,
}: {
  condition: string;
  action: string;
  priority: string;
}) {
  const priorityConfig = {
    High: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    Normal: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    Fallback: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    "Last resort": "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-primary/10 text-primary">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{condition}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {action}
          </p>
        </div>
      </div>
      <Badge className={cn("text-xs", priorityConfig[priority as keyof typeof priorityConfig])}>
        {priority}
      </Badge>
    </div>
  );
}

// QuickTemplateButton - Template button for compose sidebar (kept for potential future use)
function _QuickTemplateButton({
  label,
  description,
  icon,
  color = "primary",
  onClick,
}: {
  label: string;
  description?: string;
  icon: React.ReactNode;
  color?: "primary" | "emerald" | "blue" | "rose" | "amber" | "violet";
  onClick: () => void;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
    >
      <div className={cn("p-2 rounded-lg", colorClasses[color])}>{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

// ============================================================================
// Email Templates Panel - Fetches templates from database
// ============================================================================

function EmailTemplatesPanel({
  onSelectTemplate,
}: {
  onSelectTemplate: (template: EmailTemplate) => void;
}) {
  const { data: templates, isLoading } = useEmailTemplates();
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const getTemplateIcon = (slug: string) => {
    if (slug.includes("welcome") || slug.includes("confirmation"))
      return <UserPlus className="h-4 w-4" />;
    if (slug.includes("food") || slug.includes("alert")) return <Heart className="h-4 w-4" />;
    if (slug.includes("newsletter")) return <FileText className="h-4 w-4" />;
    if (slug.includes("reengagement") || slug.includes("miss")) return <Star className="h-4 w-4" />;
    return <Layers className="h-4 w-4" />;
  };

  const getTemplateColor = (slug: string): "emerald" | "blue" | "rose" | "amber" | "violet" => {
    if (slug.includes("welcome") || slug.includes("confirmation")) return "emerald";
    if (slug.includes("food") || slug.includes("alert")) return "rose";
    if (slug.includes("newsletter")) return "blue";
    if (slug.includes("reengagement")) return "amber";
    return "violet";
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Email Templates
          </CardTitle>
          <CardDescription className="text-xs">
            Beautiful pre-designed templates from database
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            templates
              .filter((t) => t.is_active)
              .map((template) => (
                <div key={template.id} className="group">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(template)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 hover:shadow-sm transition-all text-left"
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        getTemplateColor(template.slug) === "emerald" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        getTemplateColor(template.slug) === "blue" &&
                          "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        getTemplateColor(template.slug) === "rose" &&
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                        getTemplateColor(template.slug) === "amber" &&
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        getTemplateColor(template.slug) === "violet" &&
                          "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      )}
                    >
                      {getTemplateIcon(template.slug)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{template.name}</span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {template.subject}
                      </span>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>
              ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No templates available</p>
          )}
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate && getTemplateIcon(previewTemplate.slug)}
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {previewTemplate && (
              <iframe
                srcDoc={previewTemplate.html_content}
                className="w-full h-[500px] border-0"
                title="Email Preview"
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
