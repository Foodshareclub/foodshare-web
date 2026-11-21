"use client";

import { uploadProfileAvatar } from "@/app/actions/profile";
import peak from "@/assets/peakpx-min.jpg";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import { createPhotoUrl } from "@/utils";
import { Pencil } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type React from "react";
import { useRef, useState } from "react";

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

    const photo = createPhotoUrl(event);
    if (!photo) return;
    setPastUrl(photo.url);

    // Upload avatar using Server Action
    const formData = new FormData();
    formData.append("file", photo.file);
    formData.append("userId", profile.id);
    await uploadProfileAvatar(formData);
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="h-[180px] w-full object-cover" src={peak.src} alt="Cover" loading="lazy" decoding="async" />

      <div className="flex justify-center -mt-14 mb-2">
        <div className="relative inline-block">
          <AvatarWithRipple img={pastUrl || profile?.avatar_url || undefined} />
          {settings && (
            <button
              type="button"
              className="absolute bottom-0 end-0 size-8 bg-background hover:bg-muted p-1.5 rounded-full border border-border/80 shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95 flex items-center justify-center text-foreground"
              onClick={() => inputFileRef?.current?.click()}
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="self-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {profile?.first_name} {profile?.second_name}
          </h2>
          <input
            className="w-0 opacity-0 absolute h-[22%] start-0 top-[9%]"
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
