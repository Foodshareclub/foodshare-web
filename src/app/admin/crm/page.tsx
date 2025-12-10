/**
 * CRM Dashboard Page (Server Component)
 * Customer Relationship Management for admins
 */

import { Suspense } from "react";
import { CRMDashboardClient } from "./CRMDashboardClient";
import { getCustomerTagsCached } from "@/lib/data/crm";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

function CRMSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-lg border">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
      <div className="bg-background p-6 rounded-lg border">
        <div className="h-6 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function CRMData() {
  const supabase = await createClient();

  // Fetch customers with profile data
  const { data: customers, error } = await supabase
    .from("crm_customers")
    .select(
      `
      *,
      profiles:profile_id (
        id,
        first_name,
        second_name,
        nickname,
        email,
        avatar_url
      )
    `
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("CRM fetch error:", error);
  }

  // Fetch tags
  const tags = await getCustomerTagsCached();

  // Get stats
  const { count: totalCustomers } = await supabase
    .from("crm_customers")
    .select("*", { count: "exact", head: true });

  const { count: activeCustomers } = await supabase
    .from("crm_customers")
    .select("*", { count: "exact", head: true })
    .in("lifecycle_stage", ["active", "champion"]);

  const { count: atRiskCustomers } = await supabase
    .from("crm_customers")
    .select("*", { count: "exact", head: true })
    .eq("lifecycle_stage", "at_risk");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: newThisWeek } = await supabase
    .from("crm_customers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneWeekAgo.toISOString());

  const stats = {
    totalCustomers: totalCustomers || 0,
    activeCustomers: activeCustomers || 0,
    atRiskCustomers: atRiskCustomers || 0,
    newThisWeek: newThisWeek || 0,
  };

  // Transform customers
  const transformedCustomers = (customers || []).map((c) => ({
    id: c.id,
    profile_id: c.profile_id,
    status: c.status,
    lifecycle_stage: c.lifecycle_stage,
    engagement_score: c.engagement_score,
    churn_risk_score: c.churn_risk_score,
    total_transactions: c.total_transactions,
    last_interaction_at: c.last_interaction_at,
    created_at: c.created_at,
    full_name: c.profiles?.first_name
      ? `${c.profiles.first_name} ${c.profiles.second_name || ""}`.trim()
      : c.profiles?.nickname || c.profiles?.email || "Unknown",
    email: c.profiles?.email || "",
    avatar_url: c.profiles?.avatar_url,
  }));

  return <CRMDashboardClient customers={transformedCustomers} tags={tags} stats={stats} />;
}

export default function CRMPage() {
  return (
    <Suspense fallback={<CRMSkeleton />}>
      <CRMData />
    </Suspense>
  );
}
