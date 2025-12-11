"use client";

/**
 * CRMDashboard - Modern CRM with fixed layout and scrollable content areas
 * Features: Sticky header, sidebar navigation, scrollable panels
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  Target,
  TrendingUp,
  Zap,
  BarChart3,
  UserPlus,
  Search,
  MoreHorizontal,
  Send,
  Megaphone,
  Activity,
  Bell,
  ChevronRight,
  Sparkles,
  Heart,
  MessageSquare,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { importProfilesAsCRMCustomers } from "@/app/actions/crm";

// Types
interface Customer {
  id: string;
  profile_id: string;
  status: string;
  lifecycle_stage: string;
  engagement_score: number;
  churn_risk_score: number;
  total_transactions: number;
  last_interaction_at: string | null;
  created_at: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface CRMStats {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  newThisWeek: number;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  cached_count: number;
  color: string;
  icon_name: string;
  is_system: boolean;
}

interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: "draft" | "active" | "paused" | "archived";
  total_enrolled: number;
  total_completed: number;
  total_converted: number;
}

interface NewsletterStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalSubscribers: number;
  activeAutomations: number;
}

interface CRMDashboardProps {
  customers: Customer[];
  tags: Tag[];
  stats: CRMStats;
  campaigns?: Campaign[];
  segments?: Segment[];
  automations?: AutomationFlow[];
  newsletterStats?: NewsletterStats;
}

type ViewType = "overview" | "customers" | "segments" | "campaigns" | "automation";

// Metric Card Component
function MetricCard({
  label,
  value,
  change,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 hover:shadow-md transition-all">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorClasses[color])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", colorClasses[color])}>
            {icon}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {change !== undefined && (
            <span
              className={cn(
                "text-xs font-medium mb-1",
                change >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Lifecycle Badge
function LifecycleBadge({ stage }: { stage: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    lead: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      icon: <UserPlus className="h-3 w-3" />,
    },
    active: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    champion: {
      bg: "bg-violet-100 dark:bg-violet-900/30",
      text: "text-violet-700 dark:text-violet-400",
      icon: <Star className="h-3 w-3" />,
    },
    at_risk: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    churned: {
      bg: "bg-rose-100 dark:bg-rose-900/30",
      text: "text-rose-700 dark:text-rose-400",
      icon: <Clock className="h-3 w-3" />,
    },
  };
  const { bg, text, icon } = config[stage] || config.lead;
  return (
    <Badge className={cn("gap-1 capitalize font-medium", bg, text)}>
      {icon}
      {stage.replace("_", " ")}
    </Badge>
  );
}

// Engagement Score Bar
function EngagementScore({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8">{score}</span>
    </div>
  );
}

// Customer Row Component
function CustomerRow({
  customer,
  onAction,
}: {
  customer: Customer;
  onAction: (action: string, id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <Avatar className="h-10 w-10 ring-2 ring-background">
        <AvatarImage src={customer.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {customer.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{customer.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
      </div>
      <LifecycleBadge stage={customer.lifecycle_stage} />
      <EngagementScore score={customer.engagement_score} />
      <div className="text-right min-w-[80px]">
        <span
          className={cn(
            "text-sm font-medium",
            customer.churn_risk_score >= 70
              ? "text-rose-600"
              : customer.churn_risk_score >= 40
                ? "text-amber-600"
                : "text-emerald-600"
          )}
        >
          {customer.churn_risk_score}% risk
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAction("view", customer.id)}>
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("email", customer.id)}>
            Send Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("note", customer.id)}>
            Add Note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("tag", customer.id)}>
            Manage Tags
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Quick Segment Card
function SegmentCard({
  name,
  count,
  icon,
  color,
  growth,
}: {
  name: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  growth?: number;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all cursor-pointer group"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", color)}>{icon}</div>
        {growth !== undefined && (
          <span
            className={cn(
              "text-xs font-medium",
              growth >= 0 ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}%
          </span>
        )}
      </div>
      <p className="font-semibold text-foreground mb-1">{name}</p>
      <p className="text-2xl font-bold text-foreground">{count.toLocaleString()}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-between opacity-0 group-hover:opacity-100 transition-opacity"
      >
        View Segment <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Campaign Card
function CampaignCard({
  name,
  status,
  sent,
  opened,
  clicked,
}: {
  name: string;
  status: "draft" | "scheduled" | "sent" | "active";
  sent: number;
  opened: number;
  clicked: number;
}) {
  const statusConfig = {
    draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600" },
    scheduled: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" },
    sent: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600" },
    active: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600" },
  };
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0";
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0";

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <Badge
            className={cn("mt-1 capitalize", statusConfig[status].bg, statusConfig[status].text)}
          >
            {status}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-foreground">{sent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-600">{openRate}%</p>
          <p className="text-xs text-muted-foreground">Opened</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600">{clickRate}%</p>
          <p className="text-xs text-muted-foreground">Clicked</p>
        </div>
      </div>
    </div>
  );
}

// Automation Card
function AutomationCard({
  name,
  trigger,
  status,
  enrolled,
  completed,
  rate,
}: {
  name: string;
  trigger: string;
  status: "active" | "paused" | "draft";
  enrolled: number;
  completed: number;
  rate: number;
}) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded-lg",
              status === "active"
                ? "bg-emerald-100 text-emerald-600"
                : status === "paused"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-slate-100 text-slate-600"
            )}
          >
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{trigger}</p>
          </div>
        </div>
        <Badge
          className={cn(
            "capitalize",
            status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : status === "paused"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-700"
          )}
        >
          {status}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{enrolled} enrolled</span>
        <span className="text-muted-foreground">{completed} completed</span>
        <span className="text-emerald-600 font-medium">{rate}% conversion</span>
      </div>
    </div>
  );
}

// Trigger type display mapping
const triggerTypeLabels: Record<string, string> = {
  user_signup: "User signs up",
  first_listing: "First listing created",
  first_share: "First share completed",
  inactivity: "User inactive",
  milestone: "Milestone reached",
  segment_entry: "Enters segment",
  manual: "Manual trigger",
  scheduled: "Scheduled",
};

// Main Dashboard Component
export function CRMDashboard({
  customers,
  tags,
  stats,
  campaigns: campaignsData = [],
  segments: segmentsData = [],
  automations: automationsData = [],
  newsletterStats,
}: CRMDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = () => {
    startTransition(async () => {
      const result = await importProfilesAsCRMCustomers();
      if (result.success) {
        setImportMessage(`Imported ${result.imported} profiles`);
        router.refresh();
      } else {
        setImportMessage(`Error: ${result.error}`);
      }
      setTimeout(() => setImportMessage(null), 4000);
    });
  };

  const handleCustomerAction = (action: string, customerId: string) => {
    if (action === "view") router.push(`/profile/${customerId}`);
    if (action === "email") router.push(`/admin/email?to=${customerId}`);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLifecycle = lifecycleFilter === "all" || c.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesLifecycle;
  });

  // Build segments from real data or fallback to computed segments
  const segments =
    segmentsData.length > 0
      ? segmentsData.map((seg) => ({
          name: seg.name,
          count: seg.cached_count,
          icon:
            seg.icon_name === "heart" ? (
              <Heart className="h-4 w-4" />
            ) : seg.icon_name === "user-plus" ? (
              <UserPlus className="h-4 w-4" />
            ) : seg.icon_name === "alert-triangle" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : seg.icon_name === "star" ? (
              <Star className="h-4 w-4" />
            ) : (
              <Users className="h-4 w-4" />
            ),
          color: `bg-[${seg.color}]/10 text-[${seg.color}]`,
        }))
      : [
          {
            name: "Active Sharers",
            count: Math.round(stats.activeCustomers * 0.6),
            icon: <Heart className="h-4 w-4" />,
            color: "bg-emerald-100 text-emerald-600",
            growth: 12,
          },
          {
            name: "New Users (7d)",
            count: stats.newThisWeek,
            icon: <UserPlus className="h-4 w-4" />,
            color: "bg-blue-100 text-blue-600",
            growth: 23,
          },
          {
            name: "At Risk",
            count: stats.atRiskCustomers,
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "bg-amber-100 text-amber-600",
            growth: -5,
          },
          {
            name: "Champions",
            count: Math.round(stats.activeCustomers * 0.15),
            icon: <Star className="h-4 w-4" />,
            color: "bg-violet-100 text-violet-600",
            growth: 8,
          },
        ];

  // Build campaigns from real data
  const campaigns =
    campaignsData.length > 0
      ? campaignsData.map((c) => ({
          name: c.name,
          status: (c.status === "sending"
            ? "active"
            : c.status === "cancelled" || c.status === "paused"
              ? "draft"
              : c.status) as "draft" | "scheduled" | "sent" | "active",
          sent: c.total_sent,
          opened: c.total_opened,
          clicked: c.total_clicked,
        }))
      : [
          {
            name: "Weekly Food Tips",
            status: "sent" as const,
            sent: 2450,
            opened: 1823,
            clicked: 456,
          },
          {
            name: "Community Fridge Launch",
            status: "scheduled" as const,
            sent: 0,
            opened: 0,
            clicked: 0,
          },
          { name: "Holiday Food Drive", status: "draft" as const, sent: 0, opened: 0, clicked: 0 },
        ];

  // Build automations from real data
  const automations =
    automationsData.length > 0
      ? automationsData.map((a) => ({
          name: a.name,
          trigger: triggerTypeLabels[a.trigger_type] || a.trigger_type,
          status: a.status as "active" | "paused" | "draft",
          enrolled: a.total_enrolled,
          completed: a.total_completed,
          rate:
            a.total_enrolled > 0
              ? Math.round((a.total_converted / a.total_enrolled) * 1000) / 10
              : 0,
        }))
      : [
          {
            name: "Welcome Series",
            trigger: "User signs up",
            status: "active" as const,
            enrolled: 1234,
            completed: 987,
            rate: 34.5,
          },
          {
            name: "First Listing Nudge",
            trigger: "No listing after 3 days",
            status: "active" as const,
            enrolled: 567,
            completed: 456,
            rate: 67.2,
          },
          {
            name: "Re-engagement",
            trigger: "30 days inactive",
            status: "paused" as const,
            enrolled: 234,
            completed: 89,
            rate: 12.3,
          },
        ];

  const navItems = [
    { id: "overview" as ViewType, label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "customers" as ViewType, label: "Customers", icon: <Users className="h-4 w-4" /> },
    { id: "segments" as ViewType, label: "Segments", icon: <Target className="h-4 w-4" /> },
    { id: "campaigns" as ViewType, label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
    { id: "automation" as ViewType, label: "Automation", icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background">
      {/* Sticky Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Customer Engagement</h1>
            <p className="text-sm text-muted-foreground">
              Manage relationships and drive engagement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isPending}>
              {isPending ? "Importing..." : "Sync Profiles"}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => router.push("/admin/email")}>
              <Send className="h-4 w-4" /> New Campaign
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 px-4 pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                activeView === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Import Message */}
      <AnimatePresence>
        {importMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mx-4 mt-4 p-3 rounded-lg text-sm font-medium",
              importMessage.startsWith("Error")
                ? "bg-rose-100 text-rose-800"
                : "bg-emerald-100 text-emerald-800"
            )}
          >
            {importMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeView === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Total Customers"
                    value={stats.totalCustomers.toLocaleString()}
                    change={8}
                    icon={<Users className="h-4 w-4" />}
                    color="blue"
                  />
                  <MetricCard
                    label="Active"
                    value={stats.activeCustomers.toLocaleString()}
                    change={12}
                    icon={<UserCheck className="h-4 w-4" />}
                    color="emerald"
                  />
                  <MetricCard
                    label="At Risk"
                    value={stats.atRiskCustomers.toLocaleString()}
                    change={-3}
                    icon={<AlertTriangle className="h-4 w-4" />}
                    color="amber"
                  />
                  <MetricCard
                    label="New This Week"
                    value={stats.newThisWeek.toLocaleString()}
                    change={23}
                    icon={<TrendingUp className="h-4 w-4" />}
                    color="violet"
                  />
                </div>

                {/* Quick Segments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Quick Segments</h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveView("segments")}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {segments.map((seg) => (
                      <SegmentCard key={seg.name} {...seg} />
                    ))}
                  </div>
                </div>

                {/* Recent Campaigns & Automations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">Recent Campaigns</h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveView("campaigns")}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {campaigns.map((c) => (
                        <CampaignCard key={c.name} {...c} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground">Active Automations</h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveView("automation")}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {automations.map((a) => (
                        <AutomationCard key={a.name} {...a} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Customers Preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Top Customers</h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveView("customers")}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                    {customers.slice(0, 5).map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        onAction={handleCustomerAction}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "customers" && (
              <motion.div
                key="customers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Lifecycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="champion">Champion</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="churned">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {filteredCustomers.length} of {customers.length} customers
                  </span>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color }}
                        className="text-white cursor-pointer hover:opacity-80"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Customer List */}
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {customers.length === 0
                          ? "No customers yet. Import profiles to get started."
                          : "No customers match your filters."}
                      </p>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        onAction={handleCustomerAction}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeView === "segments" && (
              <motion.div
                key="segments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Create targeted segments for personalized engagement
                  </p>
                  <Button size="sm" className="gap-2">
                    <Target className="h-4 w-4" /> Create Segment
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {segments.map((seg) => (
                    <SegmentCard key={seg.name} {...seg} />
                  ))}
                  {/* Create New Segment Card */}
                  <div className="p-6 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer min-h-[160px]">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Target className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Create New Segment</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Define custom criteria to target specific users
                    </p>
                  </div>
                </div>

                {/* Segment Ideas */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-5">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Suggested Segments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { name: "High Engagement", desc: "Users with 70+ engagement score" },
                      { name: "Dormant Champions", desc: "Champions inactive for 14+ days" },
                      { name: "First-time Sharers", desc: "Users who shared their first item" },
                      { name: "Power Users", desc: "5+ transactions in last 30 days" },
                    ].map((idea) => (
                      <div
                        key={idea.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{idea.name}</p>
                          <p className="text-xs text-muted-foreground">{idea.desc}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Create
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "campaigns" && (
              <motion.div
                key="campaigns"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Create and manage email campaigns</p>
                  <Button size="sm" className="gap-2" onClick={() => router.push("/admin/email")}>
                    <Send className="h-4 w-4" /> New Campaign
                  </Button>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Total Sent (30d)"
                    value={newsletterStats?.totalSent.toLocaleString() || "0"}
                    icon={<Send className="h-4 w-4" />}
                    color="blue"
                  />
                  <MetricCard
                    label="Avg Open Rate"
                    value={`${newsletterStats?.avgOpenRate || 0}%`}
                    icon={<Mail className="h-4 w-4" />}
                    color="emerald"
                  />
                  <MetricCard
                    label="Avg Click Rate"
                    value={`${newsletterStats?.avgClickRate || 0}%`}
                    icon={<Activity className="h-4 w-4" />}
                    color="violet"
                  />
                  <MetricCard
                    label="Subscribers"
                    value={newsletterStats?.totalSubscribers.toLocaleString() || "0"}
                    icon={<Bell className="h-4 w-4" />}
                    color="amber"
                  />
                </div>

                {/* Campaign List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((c) => (
                    <CampaignCard key={c.name} {...c} />
                  ))}
                  {/* Create New Campaign Card */}
                  <div
                    onClick={() => router.push("/admin/email")}
                    className="p-6 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer min-h-[180px]"
                  >
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Megaphone className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Create Campaign</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Send newsletters, announcements, or promotions
                    </p>
                  </div>
                </div>

                {/* Quick Templates */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Quick Start Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        name: "Weekly Newsletter",
                        desc: "Community updates and tips",
                        icon: <MessageSquare className="h-5 w-5" />,
                      },
                      {
                        name: "New Feature Announcement",
                        desc: "Introduce new platform features",
                        icon: <Sparkles className="h-5 w-5" />,
                      },
                      {
                        name: "Re-engagement",
                        desc: "Win back inactive users",
                        icon: <Heart className="h-5 w-5" />,
                      },
                    ].map((template) => (
                      <div
                        key={template.name}
                        className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "automation" && (
              <motion.div
                key="automation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Set up automated workflows to engage users at the right time
                  </p>
                  <Button size="sm" className="gap-2">
                    <Zap className="h-4 w-4" /> Create Automation
                  </Button>
                </div>

                {/* Automation Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Active Flows"
                    value={
                      newsletterStats?.activeAutomations ||
                      automations.filter((a) => a.status === "active").length
                    }
                    icon={<Workflow className="h-4 w-4" />}
                    color="emerald"
                  />
                  <MetricCard
                    label="Total Enrolled"
                    value={automations.reduce((sum, a) => sum + a.enrolled, 0).toLocaleString()}
                    icon={<Users className="h-4 w-4" />}
                    color="blue"
                  />
                  <MetricCard
                    label="Completed"
                    value={automations.reduce((sum, a) => sum + a.completed, 0).toLocaleString()}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    color="violet"
                  />
                  <MetricCard
                    label="Avg Conversion"
                    value={`${automations.length > 0 ? Math.round(automations.reduce((sum, a) => sum + a.rate, 0) / automations.length) : 0}%`}
                    icon={<TrendingUp className="h-4 w-4" />}
                    color="amber"
                  />
                </div>

                {/* Automation List */}
                <div className="space-y-3">
                  {automations.map((a) => (
                    <AutomationCard key={a.name} {...a} />
                  ))}
                </div>

                {/* Automation Ideas */}
                <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 p-5">
                  <h3 className="font-semibold text-violet-800 dark:text-violet-200 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Recommended Automations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        name: "Review Request",
                        trigger: "After successful food share",
                        desc: "Ask for feedback 24h after pickup",
                      },
                      {
                        name: "Milestone Celebration",
                        trigger: "User reaches 10 shares",
                        desc: "Celebrate achievements with badges",
                      },
                      {
                        name: "Inactivity Alert",
                        trigger: "No activity for 14 days",
                        desc: "Gentle reminder to stay engaged",
                      },
                      {
                        name: "New Listing Nearby",
                        trigger: "Listing within 5km",
                        desc: "Notify users of nearby food",
                      },
                    ].map((idea) => (
                      <div
                        key={idea.name}
                        className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground text-sm">{idea.name}</p>
                          <Button variant="ghost" size="sm">
                            Setup
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{idea.trigger}</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                          {idea.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
