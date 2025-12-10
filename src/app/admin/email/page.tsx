import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { EmailCRMClient } from "@/components/admin/EmailCRMClient";
import { Skeleton } from "@/components/ui/skeleton";

function EmailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

export default async function AdminEmailCRMPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("email_management_crm")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("smart_routing_quota_monitoring_and_complete_email_control")}
        </p>
      </div>

      <Suspense fallback={<EmailSkeleton />}>
        <EmailCRMClient />
      </Suspense>
    </div>
  );
}
