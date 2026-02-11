import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecentCampaigns, getEmailDashboardStats } from "@/lib/data/admin-email";
import { CampaignsClient } from "@/app/admin/crm/components/CampaignsClient";

function CampaignsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function CampaignsContent() {
  const [campaigns, stats] = await Promise.all([getRecentCampaigns(50), getEmailDashboardStats()]);

  return <CampaignsClient campaigns={campaigns} stats={stats} />;
}

export default async function AdminCampaignsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t("email_campaigns")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("create_and_manage_email_campaigns")}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<CampaignsSkeleton />}>
        <CampaignsContent />
      </Suspense>
    </div>
  );
}
