import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { SettingsClient } from './SettingsClient';

/**
 * Settings Page - Server Component
 * Main settings hub with navigation cards
 * Requires authentication
 */
export default async function SettingsPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?from=/settings');
  }

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsClient />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';

/**
 * Skeleton loader for settings page
 */
function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Header Skeleton */}
      <header className="border-b border-border/50 bg-card/50">
        <div className="container mx-auto px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="h-6 w-80 bg-muted rounded animate-pulse" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="container mx-auto px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Account Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div>
                <div className="h-5 w-24 bg-muted rounded animate-pulse mb-1" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card/80"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Separator */}
          <div className="h-px bg-border/50" />

          {/* Preferences Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div>
                <div className="h-5 w-28 bg-muted rounded animate-pulse mb-1" />
                <div className="h-4 w-52 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card/80 opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Separator */}
          <div className="h-px bg-border/50" />

          {/* Support Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div>
                <div className="h-5 w-40 bg-muted rounded animate-pulse mb-1" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card/80"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-28 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
