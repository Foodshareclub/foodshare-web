'use client';

import type { ChangeEvent, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import peak from '@/assets/peakpx-min.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries';
import { createPhotoUrl } from '@/utils';
import { EditIcon } from '@/utils/icons';
import type { AllValuesType } from '@/api/profileAPI';
import { AvatarWithRipple } from '@/components';
import { STORAGE_BUCKETS, getStorageUrl } from '@/constants/storage';
import { ALLOWED_MIME_TYPES } from '@/constants/mime-types';

type PropsType = {
  children?: ReactNode;
  settings?: string;
};

const ListingPersonCards: React.FC<PropsType> = ({ children, settings }) => {
  const [pastUrl, setPastUrl] = useState<string>('');
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  // Auth state from useAuth hook (TanStack Query + Zustand)
  const { user } = useAuth();
  const userId = user?.id;

  // Profile data and mutations from React Query
  const { profile, updateProfile, uploadAvatar } = useCurrentProfile(userId);

  const uploadAvatarHandler = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile?.id) return;

    const { file, filePath, url } = createPhotoUrl(event);
    setPastUrl(url);

    if (filePath && file) {
      // Upload the avatar file first
      await uploadAvatar({
        userId: profile.id,
        file,
      });

      // Update profile with new avatar URL (matches the path used in useUploadAvatar)
      const avatarPath = `${profile.id}/avatar`;
      const profileImgUrl = getStorageUrl(STORAGE_BUCKETS.AVATARS, avatarPath);
      await updateProfile({
        id: profile.id,
        avatar_url: profileImgUrl,
      });
    }
  };

  return (
    <div className="glass rounded-xl p-0 overflow-hidden">
      <img
        className="h-[200px] w-full object-cover"
        src={peak.src}
        alt="Cover"
        loading="lazy"
        decoding="async"
      />

      <div className="flex justify-center -mt-12">
        <AvatarWithRipple img={pastUrl ? pastUrl : profile?.avatar_url} />
        {settings && (
          <button
            className="bg-muted hover:bg-green-200 dark:hover:bg-green-900 p-2 rounded-full absolute cursor-pointer transition-colors"
            style={{ top: '48vh', left: '51vw' }}
            onClick={() => inputFileRef?.current?.click()}
          >
            <EditIcon />
          </button>
        )}
      </div>
      <div className="self-center p-4">
        <div>
          <h2 className="text-center text-lg font-semibold">
            {profile?.first_name} {profile?.second_name}
          </h2>
          <input
            className="w-0 opacity-0 absolute h-[22%] left-0 top-[9%]"
            accept={ALLOWED_MIME_TYPES.PROFILES.join(',')}
            ref={inputFileRef}
            type="file"
            onChange={(e) => uploadAvatarHandler(e)}
          />
          {children}
        </div>
      </div>
    </div>
  );
};

export default ListingPersonCards;
