"use client";

import { Mail, Sparkles } from "lucide-react";
import { EmailCRMDashboard } from "@/components/admin/email/EmailCRMDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailCRMData } from "@/hooks/queries/useEmailCRM";
import { useTranslations } from "next-intl";

function EmailSkeleton() {
  return (
    <div className="flex-1 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-5 gap-5">
          <Skeleton className="lg:col-span-3 h-64 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminEmailCRMPage() {
  const t = useTranslations();
  const { stats, providerHealth, campaigns, automations, segments, quotaDetails, bounceStats, isLoading } = useEmailCRMData();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t("email_management_crm")}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("smart_routing_quota_monitoring_and_complete_email_control")}
            </p>
          </div>
        </div>
      </div>

      {/* CRM takes remaining height */}
      {isLoading ? (
        <EmailSkeleton />
      ) : (
        <EmailCRMDashboard
          initialData={{
            stats,
            providerHealth,
            campaigns,
            automations,
            segments,
            quotaDetails,
            bounceStats,
          }}
        />
      )}
    </div>
  );
}
