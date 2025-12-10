/**
 * Unified Admin Dashboard Page (Server Component)
 * Industry-standard CRM with tabbed interface
 */

import { Suspense } from "react";
import { AdminUnifiedClient } from "./AdminUnifiedClient";
import { getDashboardStats, getAuditLogs } from "@/lib/data/admin";
import { getCustomerTagsCached } from "@/lib/data/crm";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

// ============================================================================
// Loading Skeleton
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
      <div className="h-12 bg-muted rounded w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-lg border border-border">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-lg border border-border h-64" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Data Fetching
// ============================================================================

async function AdminDashboardData() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [dashboardStats, auditLogs, tags, customersResult] = await Promise.all([
    getDashboardStats(),
    getAuditLogs(10),
    getCustomerTagsCached(),
    supabase
      .from("crm_customers")
      .select(
        `
        id,
        profile_id,
        status,
        lifecycle_stage,
        engagement_score,
        churn_risk_score,
        total_transactions,
        last_interaction_at,
        created_at,
        profiles:profile_id (
          first_name,
          second_name,
          email,
          avatar_url
        )
      `
      )
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const customers = (customersResult.data || []).map((c) => {
    const profile = c.profiles as {
      first_name?: string;
      second_name?: string;
      email?: string;
      avatar_url?: string;
    } | null;
    return {
      id: c.id,
      profile_id: c.profile_id,
      status: c.status || "active",
      lifecycle_stage: c.lifecycle_stage || "lead",
      engagement_score: c.engagement_score || 50,
      churn_risk_score: c.churn_risk_score || 0,
      total_transactions: c.total_transactions || 0,
      last_interaction_at: c.last_interaction_at,
      created_at: c.created_at,
      full_name: [profile?.first_name, profile?.second_name].filter(Boolean).join(" ") || "Unknown",
      email: profile?.email || "",
      avatar_url: profile?.avatar_url || null,
    };
  });

  // CRM stats
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [totalRes, activeRes, atRiskRes, newRes] = await Promise.all([
    supabase.from("crm_customers").select("*", { count: "exact", head: true }),
    supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .in("lifecycle_stage", ["active", "champion"]),
    supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .eq("lifecycle_stage", "at_risk"),
    supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo.toISOString()),
  ]);

  const crmStats = {
    totalCustomers: totalRes.count || 0,
    activeCustomers: activeRes.count || 0,
    atRiskCustomers: atRiskRes.count || 0,
    newThisWeek: newRes.count || 0,
  };

  return (
    <AdminUnifiedClient
      dashboardStats={dashboardStats}
      auditLogs={auditLogs}
      customers={customers}
      tags={tags}
      crmStats={crmStats}
    />
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardData />
    </Suspense>
  );
}
