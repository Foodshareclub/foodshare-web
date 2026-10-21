import { AudienceClient } from "@/app/admin/crm/components/AudienceClient";
import { Skeleton } from "@/components/ui/skeleton";
import { getAudienceSegments, getEmailDashboardStats } from "@/lib/data/admin-email";
import { Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

const AUDIENCE_SKELETON_KEYS = ["s-1", "s-2", "s-3", "s-4"] as const;
const AUDIENCE_CARD_KEYS = ["c-1", "c-2", "c-3", "c-4", "c-5", "c-6"] as const;

function AudienceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {AUDIENCE_SKELETON_KEYS.map((skeletonKey) => (
          <Skeleton key={skeletonKey} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {AUDIENCE_CARD_KEYS.map((skeletonKey) => (
          <Skeleton key={skeletonKey} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function AudienceContent() {
  const [segments, stats] = await Promise.all([getAudienceSegments(), getEmailDashboardStats()]);

  return <AudienceClient segments={segments} stats={stats} />;
}

export default async function AdminAudiencePage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t("audience_segments")}</h1>
            <p className="text-sm text-muted-foreground">{t("manage_subscriber_segments_and_targeting")}</p>
          </div>
        </div>
      </div>

      <Suspense fallback={<AudienceSkeleton />}>
        <AudienceContent />
      </Suspense>
    </div>
  );
}
