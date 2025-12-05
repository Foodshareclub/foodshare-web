/**
 * Admin Dashboard Page (Server Component)
 * Fetches data server-side and passes to client component
 * Uses Suspense for streaming
 */

import { Suspense } from 'react';
import { getDashboardStats, getAuditLogs } from '@/lib/data/admin';
import { AdminDashboardClient } from './AdminDashboardClient';

// Route segment config for caching
export const revalidate = 300; // Revalidate every 5 minutes

// ============================================================================
// Loading Skeleton
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-lg border border-border">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>

      {/* Additional Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-background p-6 rounded-lg border border-border">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>

      {/* Quick Actions and Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="bg-background p-6 rounded-lg border border-border">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Data Fetching Component
// ============================================================================

async function AdminDashboardData() {
  // Fetch data in parallel
  const [stats, auditLogs] = await Promise.all([
    getDashboardStats(),
    getAuditLogs(10),
  ]);

  return <AdminDashboardClient stats={stats} auditLogs={auditLogs} />;
}

// ============================================================================
// Page Component (Server Component)
// ============================================================================

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardData />
    </Suspense>
  );
}
