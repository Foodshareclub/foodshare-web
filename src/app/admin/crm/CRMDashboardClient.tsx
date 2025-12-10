"use client";

/**
 * CRM Dashboard Client Component
 * Handles filtering, search, and interactive elements
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { cn } from "@/lib/utils";
import { importProfilesAsCRMCustomers } from "@/app/actions/crm";

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

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  newThisWeek: number;
}

interface CRMDashboardClientProps {
  customers: Customer[];
  tags: Tag[];
  stats: Stats;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-background p-6 rounded-lg border border-border hover:shadow-md transition-shadow">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-3xl font-bold", color)}>{value.toLocaleString()}</p>
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

export function CRMDashboardClient({ customers, tags, stats }: CRMDashboardClientProps) {
  const _t = useTranslations();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Relationship Management</h1>
          <p className="text-muted-foreground">Manage and track customer engagement</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={isPending} variant="outline">
            {isPending ? "Importing..." : "Import Profiles"}
          </Button>
          <Button onClick={() => router.push("/admin")}>← Back to Dashboard</Button>
        </div>
      </div>

      {/* Import Message */}
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

      {/* Customer List */}
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
