"use client";

import type { ChangeEvent, ReactNode } from "react";
import React, { useRef, useState } from "react";
import peak from "@/assets/peakpx-min.jpg";
import { createPhotoUrl } from "@/utils";
import { EditIcon } from "@/utils/icons";
import { AvatarWithRipple } from "@/components";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import { uploadProfileAvatar } from "@/app/actions/profile";

type PropsType = {
  children?: ReactNode;
  settings?: string;
  /** Profile data passed from server */
  profile?: {
    id: string;
    first_name?: string | null;
    second_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

/**
 * ListingPersonCards Component
 * Displays user profile card with avatar upload
 * Receives profile data as props from Server Component
 */
const ListingPersonCards: React.FC<PropsType> = ({ children, settings, profile }) => {
  const [pastUrl, setPastUrl] = useState<string>("");
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const uploadAvatarHandler = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile?.id) return;

    const { file, url } = createPhotoUrl(event);
    setPastUrl(url);

    if (file) {
      // Upload avatar using Server Action
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", profile.id);
      await uploadProfileAvatar(formData);
    }
  };

  return (
    <div className="glass rounded-xl p-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="h-[200px] w-full object-cover"
        src={peak.src}
        alt="Cover"
        loading="lazy"
        decoding="async"
      />

      <div className="flex justify-center -mt-12">
        <AvatarWithRipple img={pastUrl || profile?.avatar_url || undefined} />
        {settings && (
          <button
            className="bg-muted hover:bg-green-200 dark:hover:bg-green-900 p-2 rounded-full absolute cursor-pointer transition-colors"
            style={{ top: "48vh", left: "51vw" }}
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
            accept={ALLOWED_MIME_TYPES.PROFILES.join(",")}
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
