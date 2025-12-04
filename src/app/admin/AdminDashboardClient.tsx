'use client';

/**
 * Admin Dashboard Client Component
 * Handles interactive elements - buttons, navigation
 * Receives pre-fetched data from Server Component parent
 */

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

// Import types from Server Actions
import type { DashboardStats, AuditLog } from '@/app/actions/admin';

interface AdminDashboardClientProps {
  stats: DashboardStats;
  auditLogs: AuditLog[];
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  colorScheme?: 'green' | 'blue' | 'orange' | 'red';
}

const StatCard = memo<StatCardProps>(({ label, value, colorScheme = 'green' }) => {
  const colorClasses = {
    green: 'border-green-300 hover:border-green-400 text-green-600',
    blue: 'border-blue-300 hover:border-blue-400 text-blue-600',
    orange: 'border-orange-300 hover:border-orange-400 text-orange-600',
    red: 'border-red-300 hover:border-red-400 text-red-600',
  };

  return (
    <div className="bg-background p-6 rounded-lg border border-border hover:shadow-md transition-all duration-200">
      <div>
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        <p className={`text-3xl font-bold ${colorClasses[colorScheme]}`}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

interface AuditLogItemProps {
  action: string;
  createdAt: string;
}

const AuditLogItem = memo<AuditLogItemProps>(({ action, createdAt }) => {
  const date = new Date(createdAt).toLocaleString();

  return (
    <div className="p-3 border-b border-border last:border-b-0 hover:bg-muted/50">
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground">{action}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  );
});

AuditLogItem.displayName = 'AuditLogItem';

// ============================================================================
// Main Client Component
// ============================================================================

export function AdminDashboardClient({ stats, auditLogs }: AdminDashboardClientProps) {
  const t = useTranslations();
  const router = useRouter();

  const approvalRate =
    stats.totalProducts > 0
      ? ((stats.activeProducts / stats.totalProducts) * 100).toFixed(1)
      : '0';

  const activeRate = Math.round(
    (stats.activeProducts / (stats.totalProducts || 1)) * 100
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('dashboard_overview')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('monitor_and_manage_your_platform')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats.totalProducts} colorScheme="blue" />
        <StatCard label="Pending Review" value={stats.pendingProducts} colorScheme="orange" />
        <StatCard label="Active Products" value={stats.activeProducts} colorScheme="green" />
        <StatCard label="Total Chats" value={stats.totalChats} colorScheme="red" />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="New This Week" value={stats.newUsersThisWeek} />
        <StatCard label="Active Rate" value={activeRate} />
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4">{t('quick_actions')}</h2>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/admin/listings?status=pending')}
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {t('view_pending_listings')} ({stats.pendingProducts})
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/listings')}
              size="lg"
              className="w-full border-blue-500 text-blue-500 hover:bg-blue-50"
            >
              {t('view_all_listings')} ({stats.totalProducts})
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/users')}
              size="lg"
              className="w-full border-green-500 text-green-500 hover:bg-green-50"
            >
              {t('manage_users')}
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4">{t('recent_activity')}</h2>
          <div className="max-h-[300px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('no_recent_activity')}
              </p>
            ) : (
              <div className="flex flex-col">
                {auditLogs.map((log) => (
                  <AuditLogItem
                    key={log.id}
                    action={log.action}
                    createdAt={log.created_at}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-2">{t('approval_rate')}</h2>
          <p className="text-3xl font-bold text-green-600">{approvalRate}%</p>
        </div>
        <div className="bg-background p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-2">{t('pending')}</h2>
          <p className="text-3xl font-bold text-blue-600">
            {stats.pendingProducts} items
          </p>
        </div>
      </div>
    </div>
  );
}
