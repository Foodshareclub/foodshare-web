'use client';

/**
 * Profile Settings Client Component
 * Shows user profile card and settings navigation
 * Enhanced with modern animations and glassmorphism
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  HiOutlineUser,
  HiOutlineShieldCheck,
  HiOutlineCog,
  HiOutlineChevronRight,
  HiOutlineSparkles,
  HiOutlineBell,
  HiOutlineGlobe,
  HiOutlineHeart,
} from 'react-icons/hi';
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import ListingPersonCards from '@/components/listingPersonCard/ListingPersonCards';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/app/actions/auth';

type SettingsCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  settingTitle: string;
  description: string;
  route: string;
  badge?: string;
  index: number;
  isLoaded: boolean;
};

const SettingsCard = ({
  icon,
  iconBg,
  settingTitle,
  description,
  route,
  badge,
  index,
  isLoaded,
}: SettingsCardProps) => {
  const router = useRouter();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:border-border hover:scale-[1.02] hover:bg-card',
        'transform',
        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
      style={{ transitionDelay: `${index * 100 + 200}ms` }}
      onClick={() => router.push(route)}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 p-3 rounded-xl transition-transform duration-300 group-hover:scale-110',
            iconBg
          )}>
            {icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {settingTitle}
              </h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
          
          {/* Arrow */}
          <div className="flex-shrink-0 self-center">
            <HiOutlineChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProfileSettingsClientProps {
  user: AuthUser;
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const settingsInfo = [
    {
      icon: <HiOutlineUser className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      settingTitle: 'Personal info',
      description: 'Provide personal details and how we can reach you',
      route: '/profile/edit',
    },
    {
      icon: <HiOutlineShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      settingTitle: 'Login & security',
      description: 'Update your password and secure your account',
      route: '/settings/login-security',
    },
    {
      icon: <HiOutlineBell className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      settingTitle: 'Notifications',
      description: 'Choose what notifications you want to receive',
      route: '/settings/notifications',
    },
    {
      icon: <HiOutlineGlobe className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      settingTitle: 'Language & region',
      description: 'Set your preferred language and regional settings',
      route: '/settings/language',
    },
    {
      icon: <HiOutlineHeart className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      settingTitle: 'Saved items',
      description: 'View your saved listings and favorites',
      route: '/favorites',
      badge: 'New',
    },
    {
      icon: <HiOutlineCog className="h-6 w-6 text-slate-600 dark:text-slate-400" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800/50',
      settingTitle: 'Preferences',
      description: 'Customize your app experience and display settings',
      route: '/settings/preferences',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-500/10 to-transparent blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative container mx-auto max-w-5xl pt-24 pb-12 px-4">
        {/* Page Header */}
        <div className={cn(
          'mb-8 transform transition-all duration-500',
          isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        )}>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Account Settings
            </h1>
            <HiOutlineSparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Header Card */}
        <div className={cn(
          'mb-8 transform transition-all duration-500 delay-100',
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-lg transition-shadow duration-300">
            {/* Decorative gradient */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
            
            <div className="relative p-6">
              <ListingPersonCards settings="settings" />
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className={cn(
          'flex items-center gap-3 mb-6 transform transition-all duration-500 delay-150',
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          <HiOutlineCog className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <Separator className="flex-1" />
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsInfo.map((card, i) => (
            <SettingsCard
              key={card.route}
              icon={card.icon}
              iconBg={card.iconBg}
              settingTitle={card.settingTitle}
              description={card.description}
              route={card.route}
              badge={card.badge}
              index={i}
              isLoaded={isLoaded}
            />
          ))}
        </div>

        {/* Danger Zone */}
        <div className={cn(
          'mt-12 transform transition-all duration-500',
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
        style={{ transitionDelay: '800ms' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <HiOutlineArrowRightOnRectangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Account Actions</h2>
            <Separator className="flex-1" />
          </div>
          
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Need to take a break? You can log out or deactivate your account at any time.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                Log out
              </button>
              <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                Deactivate account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettingsClient;
