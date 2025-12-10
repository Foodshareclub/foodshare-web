"use client";

/**
 * Unified Admin CRM Dashboard
 * Industry-standard tabbed interface combining all admin functions
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, ClipboardList, Mail, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importProfilesAsCRMCustomers } from "@/app/actions/crm";
import type { DashboardStats, AuditLog } from "@/lib/data/admin";

// ============================================================================
// Types
// ============================================================================

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

interface AdminUnifiedClientProps {
  dashboardStats: DashboardStats;
  auditLogs: AuditLog[];
  customers: Customer[];
  tags: Tag[];
  crmStats: CRMStats;
}

type TabId = "overview" | "customers" | "listings" | "users" | "email";

// ============================================================================
// Shared Components
// ============================================================================

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-background p-6 rounded-lg border border-border hover:shadow-md transition-shadow">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-3xl font-bold", color)}>{value.toLocaleString()}</p>
    </div>
  );
}

function AuditLogItem({ action, createdAt }: { action: string; createdAt: string }) {
  return (
    <div className="p-3 border-b border-border last:border-b-0 hover:bg-muted/50">
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground">{action}</p>
        <p className="text-xs text-muted-foreground">{new Date(createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function LifecycleBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    lead: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    champion: "bg-purple-100 text-purple-800",
    at_risk: "bg-orange-100 text-orange-800",
    churned: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={cn("capitalize", colors[stage] || "bg-gray-100")}>
      {stage.replace("_", " ")}
    </Badge>
  );
}

function EngagementBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}</span>
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

function OverviewTab({
  stats,
  auditLogs,
  onNavigate,
}: {
  stats: DashboardStats;
  auditLogs: AuditLog[];
  onNavigate: (tab: TabId) => void;
}) {
  const t = useTranslations();
  const approvalRate =
    stats.totalProducts > 0 ? ((stats.activeProducts / stats.totalProducts) * 100).toFixed(1) : "0";
  const activeRate = Math.round((stats.activeProducts / (stats.totalProducts || 1)) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={stats.totalProducts} color="text-blue-600" />
        <StatCard label="Pending Review" value={stats.pendingProducts} color="text-orange-600" />
        <StatCard label="Active Listings" value={stats.activeProducts} color="text-green-600" />
        <StatCard label="Total Chats" value={stats.totalChats} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} color="text-blue-600" />
        <StatCard label="New This Week" value={stats.newUsersThisWeek} color="text-green-600" />
        <StatCard label="Active Rate" value={activeRate} color="text-purple-600" />
      </div>

      {/* Quick Actions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4">{t("quick_actions")}</h2>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => onNavigate("listings")}
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {t("view_pending_listings")} ({stats.pendingProducts})
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("customers")}
              size="lg"
              className="w-full border-purple-500 text-purple-500 hover:bg-purple-50"
            >
              Manage Customers
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("users")}
              size="lg"
              className="w-full border-green-500 text-green-500 hover:bg-green-50"
            >
              {t("manage_users")}
            </Button>
          </div>
        </div>

        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4">{t("recent_activity")}</h2>
          <div className="max-h-[300px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("no_recent_activity")}</p>
            ) : (
              <div className="flex flex-col">
                {auditLogs.map((log) => (
                  <AuditLogItem key={log.id} action={log.action} createdAt={log.created_at} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-2">{t("approval_rate")}</h2>
          <p className="text-3xl font-bold text-green-600">{approvalRate}%</p>
        </div>
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-2">{t("pending")}</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.pendingProducts} items</p>
        </div>
      </div>
    </div>
  );
}

function CustomersTab({
  customers,
  tags,
  stats,
}: {
  customers: Customer[];
  tags: Tag[];
  stats: CRMStats;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = () => {
    startTransition(async () => {
      const result = await importProfilesAsCRMCustomers();
      if (result.success) {
        setImportMessage(`Imported ${result.imported} profiles as customers`);
        router.refresh();
      } else {
        setImportMessage(`Error: ${result.error}`);
      }
      setTimeout(() => setImportMessage(null), 5000);
    });
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesLifecycle = lifecycleFilter === "all" || c.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesLifecycle;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Import */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Manage and track customer engagement</p>
        <Button onClick={handleImport} disabled={isPending} variant="outline">
          {isPending ? "Importing..." : "Import Profiles"}
        </Button>
      </div>

      {importMessage && (
        <div
          className={cn(
            "p-4 rounded-lg",
            importMessage.startsWith("Error")
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          )}
        >
          {importMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={stats.totalCustomers} color="text-blue-600" />
        <StatCard label="Active" value={stats.activeCustomers} color="text-green-600" />
        <StatCard label="At Risk" value={stats.atRiskCustomers} color="text-orange-600" />
        <StatCard label="New This Week" value={stats.newThisWeek} color="text-purple-600" />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lifecycle Stage" />
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
        <span className="text-sm text-muted-foreground">{filteredCustomers.length} customers</span>
      </div>

      {/* Customer Table */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium">Customer</th>
              <th className="text-left p-4 font-medium">Stage</th>
              <th className="text-left p-4 font-medium">Engagement</th>
              <th className="text-left p-4 font-medium">Churn Risk</th>
              <th className="text-left p-4 font-medium">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {customers.length === 0
                    ? "No customers yet. Import profiles to get started."
                    : "No customers match your filters."}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={customer.avatar_url || undefined} />
                        <AvatarFallback>
                          {customer.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <LifecycleBadge stage={customer.lifecycle_stage} />
                  </td>
                  <td className="p-4">
                    <EngagementBar score={customer.engagement_score} />
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "font-medium",
                        customer.churn_risk_score >= 70
                          ? "text-red-600"
                          : customer.churn_risk_score >= 40
                            ? "text-orange-600"
                            : "text-green-600"
                      )}
                    >
                      {customer.churn_risk_score}%
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {customer.last_interaction_at
                      ? new Date(customer.last_interaction_at).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, href }: { title: string; href: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <p className="text-muted-foreground">
        {title} management is available on a dedicated page for better performance.
      </p>
      <Button onClick={() => router.push(href)}>Open {title} Management</Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "customers", label: "Customers", icon: <UserCircle className="w-4 h-4" /> },
  { id: "listings", label: "Listings", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
];

export function AdminUnifiedClient({
  dashboardStats,
  auditLogs,
  customers,
  tags,
  crmStats,
}: AdminUnifiedClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const handleTabChange = (tab: TabId) => {
    // For heavy pages, navigate to dedicated route
    if (tab === "listings") {
      router.push("/admin/listings");
      return;
    }
    if (tab === "users") {
      router.push("/admin/users");
      return;
    }
    if (tab === "email") {
      router.push("/admin/email");
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">{t("monitor_and_manage_your_platform")}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab stats={dashboardStats} auditLogs={auditLogs} onNavigate={handleTabChange} />
        )}
        {activeTab === "customers" && (
          <CustomersTab customers={customers} tags={tags} stats={crmStats} />
        )}
        {activeTab === "listings" && <PlaceholderTab title="Listings" href="/admin/listings" />}
        {activeTab === "users" && <PlaceholderTab title="Users" href="/admin/users" />}
        {activeTab === "email" && <PlaceholderTab title="Email" href="/admin/email" />}
      </div>
    </div>
  );
}
