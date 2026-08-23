import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotificationsSettingsClient } from "./NotificationsSettingsClient";
import { getUser } from "@/app/actions/auth";
import { getFullNotificationPreferences } from "@/app/actions/notifications";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Notification Settings",
  "Manage push, email, and Telegram notification preferences"
);

/**
 * Notification Settings Page - Server Component
 */
export default async function NotificationsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login?from=/settings/notifications");
  }

  const prefsRes = await getFullNotificationPreferences();
  const initialData = prefsRes.success && prefsRes.data ? prefsRes.data : null;

  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsSettingsClient user={user} initialData={initialData} />
    </Suspense>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-10">
      <div className="container mx-auto max-w-3xl px-4 py-6 lg:py-10">
        <div className="mb-6">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/50 bg-card/50 p-6 h-36 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
