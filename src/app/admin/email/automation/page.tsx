import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveAutomations, getEmailDashboardStats } from "@/lib/data/admin-email";

// Dynamic import for code-splitting (~100KB saved from initial bundle)
const AutomationClient = dynamic(() =>
  import("@/app/admin/crm/components/AutomationClient").then((mod) => mod.AutomationClient)
);

function AutomationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function AutomationContent() {
  const [automations, stats] = await Promise.all([
    getActiveAutomations(),
    getEmailDashboardStats(),
  ]);

  return <AutomationClient automations={automations} stats={stats} />;
}

export default async function AdminAutomationPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t("email_automation")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("automated_email_flows_and_sequences")}
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<AutomationSkeleton />}>
        <AutomationContent />
      </Suspense>
    </div>
  );
}
