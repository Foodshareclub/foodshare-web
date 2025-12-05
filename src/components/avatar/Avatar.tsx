'use client';

import type { ChangeEvent } from "react";
import React, { useRef, useState } from "react";
import Image from "next/image";
import cloud from "@/assets/cloud.svg";
import { createPhotoUrl } from "@/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/queries/useProfileQueries";
import { Button } from "@/components/ui/button";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";

type PropsType = {
  size: number;
  onUpload: (filePath: string, file: File) => void;
  /** Optional override for avatar URL (if not provided, uses current user's avatar) */
  avatarUrl?: string;
};

/**
 * Avatar Component
 * Displays user avatar with upload functionality
 * Uses useCurrentProfile hook (React Query) instead of Redux
 */
const Avatar: React.FC<PropsType> = ({ size, onUpload, avatarUrl: propAvatarUrl }) => {
  // Get current user's avatar from React Query
  const { user } = useAuth();
  const { avatarUrl: profileAvatarUrl } = useCurrentProfile(user?.id);

  // Use prop avatar URL if provided, otherwise use profile avatar
  const imgUrl = propAvatarUrl ?? profileAvatarUrl;

  const [pastUrl, setPastUrl] = useState<string | undefined>(imgUrl ?? undefined);
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const { file, filePath, url } = createPhotoUrl(event);
    onUpload(filePath, file);
    setPastUrl(url);
  };

  return (
    <div className="glass-input rounded-xl p-4 border border-dashed border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-500 hover:-translate-y-0.5">
      <div className="flex justify-between items-center gap-4">
        {(imgUrl || pastUrl) && (imgUrl !== "" || pastUrl !== "") ? (
          <div className="relative mx-auto" style={{ height: size, width: size }}>
            <Image
              style={{ borderRadius: "10px" }}
              src={pastUrl || imgUrl || ""}
              alt="User avatar"
              fill
              className="object-cover"
              sizes={`${size}px`}
            />
          </div>
        ) : (
          <>
            <div className="self-center relative w-[50px] h-[50px]">
              <Image className="rounded-full" src={cloud} alt="Upload icon" fill />
            </div>

            <div className="flex-1">
              <p className="font-medium">
                "Select a file or drag and drop here"
              </p>
              <p className="text-sm text-muted-foreground">
                "JPG or PNG file size no more than 10MB"
              </p>
            </div>
          </>
        )}
        <div className="self-center relative">
          <input
            className="opacity-0 absolute h-[22%] left-0 top-[9%]"
            accept={ALLOWED_MIME_TYPES.PROFILES.join(",")}
            ref={inputFileRef}
            type="file"
            onChange={(e) => uploadAvatar(e)}
          />

          <Button onClick={() => inputFileRef?.current?.click()} variant="glass" className="glass-accent-orange">
            "Download"
          </Button>
        </div>
      </div>
    </div>
  );
};
export default Avatar;
