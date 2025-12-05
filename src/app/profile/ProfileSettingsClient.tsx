'use client';

/**
 * Profile Settings Client Component
 * Shows user profile card and settings navigation
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import ListingPersonCards from '@/components/listingPersonCard/ListingPersonCards';
import Image from 'next/image';
import personalInfo from '@/assets/personal_info.png';
import userShield from '@/assets/user_shield.png';
import type { AuthUser } from '@/app/actions/auth';

type SettingsCardProps = {
  imgSRC: typeof personalInfo;
  settingTitle: string;
  description: string;
  route: string;
};

const SettingsCard: React.FC<SettingsCardProps> = ({
  imgSRC,
  settingTitle,
  description,
  route,
}) => {
  const router = useRouter();

  return (
    <div
      className="glass rounded-xl cursor-pointer hover:shadow-lg transition-shadow p-6"
      onClick={() => router.push(route)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <Image
            src={imgSRC}
            alt={settingTitle}
            width={48}
            height={48}
            className="rounded-lg"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1 text-foreground">
            {settingTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

interface ProfileSettingsClientProps {
  user: AuthUser;
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const settingsInfo = [
    {
      img: personalInfo,
      settingTitle: 'Personal info',
      description: 'Provide personal details and how we can reach you',
      route: '/profile/edit',
    },
    {
      img: userShield,
      settingTitle: 'Login & security',
      description: 'Update your password and secure your account',
      route: '/settings/login-security',
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-6xl pt-24 pb-12 px-4">
        {/* Profile Header Card */}
        <div className="mb-8">
          <ListingPersonCards settings="settings" />
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsInfo.map((card, i) => (
            <SettingsCard
              key={i}
              settingTitle={card.settingTitle}
              description={card.description}
              imgSRC={card.img}
              route={card.route}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettingsClient;
