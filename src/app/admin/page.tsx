/**
 * Unified Admin Dashboard Page (Server Component)
 * Modern CRM with fixed layout and scrollable content
 */

import { Suspense } from "react";
import { CRMDashboard } from "@/components/admin/crm/CRMDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCustomerTagsCached,
  getAdminCustomersCached,
  getAdminCRMStatsCached,
} from "@/lib/data/crm";
import {
  getCampaigns,
  getSegments,
  getAutomationFlows,
  getNewsletterStats,
} from "@/lib/data/newsletter";

export const revalidate = 300;

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
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="flex-1 p-4 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const defaultCRMStats = {
  totalCustomers: 0,
  activeCustomers: 0,
  atRiskCustomers: 0,
  newThisWeek: 0,
};

const defaultNewsletterStats = {
  totalCampaigns: 0,
  totalSent: 0,
  avgOpenRate: 0,
  avgClickRate: 0,
  totalSubscribers: 0,
  activeAutomations: 0,
};

async function fetchCRMData() {
  try {
    const [tags, customers, crmStats, campaigns, segments, automations, newsletterStats] =
      await Promise.all([
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
  const { tags, customers, crmStats, campaigns, segments, automations, newsletterStats } =
    await fetchCRMData();

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
    })
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
