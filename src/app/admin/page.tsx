/**
 * Unified Admin Dashboard Page (Server Component)
 * Industry-standard CRM with tabbed interface
 */

import { Suspense } from "react";
import { AdminUnifiedClient } from "./AdminUnifiedClient";
import { getDashboardStats, getAuditLogs } from "@/lib/data/admin";
import {
  getCustomerTagsCached,
  getAdminCustomersCached,
  getAdminCRMStatsCached,
} from "@/lib/data/crm";

export const revalidate = 300;

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

const defaultStats = {
  totalUsers: 0,
  totalProducts: 0,
  activeProducts: 0,
  pendingProducts: 0,
  totalChats: 0,
  newUsersThisWeek: 0,
};

const defaultCRMStats = {
  totalCustomers: 0,
  activeCustomers: 0,
  atRiskCustomers: 0,
  newThisWeek: 0,
};

async function fetchAdminData() {
  try {
    const [dashboardStats, auditLogs, tags, customers, crmStats] = await Promise.all([
      getDashboardStats(),
      getAuditLogs(10),
      getCustomerTagsCached(),
      getAdminCustomersCached(100),
      getAdminCRMStatsCached(),
    ]);
    return { dashboardStats, auditLogs, tags, customers, crmStats };
  } catch (error) {
    console.error("[Admin] Dashboard data fetch error:", error);
    return {
      dashboardStats: defaultStats,
      auditLogs: [],
      tags: [],
      customers: [],
      crmStats: defaultCRMStats,
    };
  }
}

async function AdminDashboardData() {
  const { dashboardStats, auditLogs, tags, customers, crmStats } = await fetchAdminData();

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

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardData />
    </Suspense>
  );
}
