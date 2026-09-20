/**
 * Unified Admin Dashboard Page (Server Component)
 * Modern CRM with fixed layout and scrollable content
 */

import { CRMDashboard } from "@/app/admin/crm/components/CRMDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminCRMStatsCached, getAdminCustomersCached, getCustomerTagsCached } from "@/lib/data/crm";
import { getAutomationFlows, getCampaigns, getNewsletterStats, getSegments } from "@/lib/data/newsletter";
import { isPrerenderInterruption } from "@/lib/errors";
import { Suspense } from "react";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {["customers", "revenue", "campaigns", "subscribers"].map((metric) => (
            <Skeleton key={metric} className="h-24 rounded-lg" />
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

const defaultCRMStats = {
  totalCustomers: 0,
  activeCustomers: 0,
  newThisMonth: 0,
  churnRate: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
  customerLifetimeValue: 0,
};

const defaultNewsletterStats = {
  totalSubscribers: 0,
  activeAutomations: 0,
};

async function fetchCRMData() {
  try {
    const [tags, customers, crmStats, campaigns, segments, automations, newsletterStats] = await Promise.all([
      getCustomerTagsCached(),
      getAdminCustomersCached(100),
      getAdminCRMStatsCached(),
      getCampaigns(10),
      getSegments(),
      getAutomationFlows(),
      getNewsletterStats(),
    ]);
    return { tags, customers, crmStats, campaigns, segments, automations, newsletterStats };
  } catch (error) {
    if (isPrerenderInterruption(error)) {
      throw error;
    }
    console.error("[Admin] CRM data fetch error:", error);
    return {
      tags: [],
      customers: [],
      crmStats: defaultCRMStats,
      campaigns: [],
      segments: [],
      automations: [],
      newsletterStats: defaultNewsletterStats,
    };
  }
}

async function AdminDashboardData() {
  const { tags, customers, crmStats, campaigns, segments, automations, newsletterStats } = await fetchCRMData();

  // Ensure data is serializable to prevent "Server Components render" errors
  // This handles Date objects, undefined values, and other non-serializable types
  const sanitizedProps = JSON.parse(
    JSON.stringify({
      customers,
      tags,
      stats: crmStats,
      campaigns,
      segments,
      automations,
      newsletterStats,
    }),
  );

  return <CRMDashboard {...sanitizedProps} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardData />
    </Suspense>
  );
}
