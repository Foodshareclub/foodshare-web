import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SettingsClient } from "./SettingsClient";
import { getUser } from "@/app/actions/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Settings",
  "Manage your FoodShare account settings"
);

/**
 * Settings Page - Server Component
 * Main settings hub with navigation cards
 * Requires authentication
 */
export default async function SettingsPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login?from=/settings");
  }

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsClient />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";

/**
 * Skeleton loader for settings page
 * Matches the modern sidebar + content layout
 */
function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header Skeleton */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
            <div>
              <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar Skeleton */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-6">
              {/* Account section */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-3" />
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border/50" />

              {/* Preferences section */}
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 opacity-50">
                    <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-3 w-14 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 space-y-8">
            {/* Welcome section */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1">
                        <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
