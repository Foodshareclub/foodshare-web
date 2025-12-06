import { Suspense } from 'react';
import { getUser, checkIsAdmin } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { SettingsNavbar } from './SettingsNavbar';

/**
 * Fetch profile directly without unstable_cache to avoid cookies() conflict
 */
async function getProfileForNavbar(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('first_name, second_name, avatar_url')
    .eq('id', userId)
    .single();
  return data;
}

/**
 * Settings Layout - Server Component
 * Provides navbar for all settings pages
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, isAdmin] = await Promise.all([getUser(), checkIsAdmin()]);

  // Get profile data if user is authenticated (direct fetch, no cache)
  let profile = null;
  if (user?.id) {
    profile = await getProfileForNavbar(user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<NavbarSkeleton />}>
        <SettingsNavbar
          userId={user?.id}
          isAuth={!!user}
          isAdmin={isAdmin}
          imgUrl={profile?.avatar_url || ''}
          firstName={profile?.first_name || ''}
          secondName={profile?.second_name || ''}
          email={user?.email || ''}
        />
      </Suspense>
      {children}
    </div>
  );
}

function NavbarSkeleton() {
  return (
    <>
      <div className="bg-background w-full fixed top-0 z-[100] border-b border-border">
        <div className="flex items-center justify-between gap-4 px-4 md:px-7 xl:px-20 pt-4 pb-1.5">
          <div className="w-[140px]">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-10 w-96 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="w-[140px] flex justify-end">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center px-4 md:px-7 xl:px-20 py-3">
          <div className="h-12 w-full max-w-[850px] bg-muted rounded-full animate-pulse" />
        </div>
      </div>
      <div style={{ height: '170px' }} />
    </>
  );
}
