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
 * Matches the bento-grid layout with user profile header
 */
function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header Skeleton */}
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-muted animate-pulse" />
            <div>
              <div className="h-6 lg:h-7 w-24 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 lg:h-4 w-40 bg-muted rounded animate-pulse hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar Skeleton */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-6">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded animate-pulse mb-3" />
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
              <div className="space-y-2">
                <div className="h-3 w-20 bg-muted rounded animate-pulse mb-3" />
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
          <main className="flex-1 min-w-0 space-y-6">
            {/* User Profile Header */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-7 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-48 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-[104px] h-9 bg-muted rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
                  <div className="w-14 h-14 rounded-xl bg-muted animate-pulse mb-4" />
                  <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 w-64 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-muted rounded-full animate-pulse mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5">
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse mb-3" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
