import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Mail, Sparkles } from "lucide-react";
import { EmailCRMClient } from "@/components/admin/EmailCRMClient";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmailCRMData } from "@/lib/data/admin-email";

function EmailSkeleton() {
  return (
    <div className="flex-1 rounded-2xl border border-border/40 bg-card/50 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function EmailCRMWithData() {
  const data = await getEmailCRMData();
  return <EmailCRMClient initialData={data} />;
}

export default async function AdminEmailCRMPage() {
  const t = await getTranslations();

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
      <Suspense fallback={<EmailSkeleton />}>
        <EmailCRMWithData />
      </Suspense>
    </div>
  );
}
