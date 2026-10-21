"use client";

import cloud from "@/assets/cloud.svg";
import { Button } from "@/components/ui/button";
import { ALLOWED_MIME_TYPES } from "@/constants/mime-types";
import { createPhotoUrl } from "@/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ChangeEvent } from "react";
import type React from "react";
import { useRef, useState } from "react";

type PropsType = {
  size: number;
  onUpload: (filePath: string, file: File) => void;
  /** Avatar URL (passed from server or parent component) */
  avatarUrl?: string;
};

/**
 * Avatar Component
 * Displays user avatar with upload functionality
 * Receives avatar URL as prop from Server Component
 */
const Avatar: React.FC<PropsType> = ({ size, onUpload, avatarUrl: propAvatarUrl }) => {
  const t = useTranslations("profile.avatar");
  // Use prop avatar URL directly
  const imgUrl = propAvatarUrl;

  const [pastUrl, setPastUrl] = useState<string | undefined>(imgUrl ?? undefined);
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = createPhotoUrl(event);
    if (!photo) return;
    onUpload(photo.filePath, photo.file);
    setPastUrl(photo.url);
  };

  return (
    <div className="glass-input rounded-xl p-4 border border-dashed border-blue-400 transition-all duration-300 ease-in-out hover:border-blue-500 hover:-translate-y-0.5">
      <div className="flex justify-between items-center gap-4">
        {(imgUrl || pastUrl) && (imgUrl !== "" || pastUrl !== "") ? (
          <div className="relative mx-auto" style={{ height: size, width: size }}>
            <Image
              style={{ borderRadius: "10px" }}
              src={pastUrl || imgUrl || ""}
              alt={t("userAvatarAlt")}
              fill
              className="object-cover"
              sizes={`${size}px`}
            />
          </div>
        ) : (
          <>
            <div className="self-center relative w-[50px] h-[50px]">
              <Image className="rounded-full" src={cloud} alt={t("uploadIconAlt")} fill />
            </div>

            <div className="flex-1">
              <p className="font-medium">{t("selectFile")}</p>
              <p className="text-sm text-muted-foreground">{t("fileSizeLimit")}</p>
            </div>
          </>
        )}
        <div className="self-center relative">
          <input
            className="opacity-0 absolute h-[22%] start-0 top-[9%]"
            accept={ALLOWED_MIME_TYPES.PROFILES.join(",")}
            ref={inputFileRef}
            type="file"
            onChange={(e) => uploadAvatar(e)}
            aria-label={t("uploadAvatarLabel")}
          />

          <Button
            onClick={() => inputFileRef?.current?.click()}
            variant="glass"
            className="glass-accent-orange"
            aria-label={t("uploadButtonLabel")}
          >
            {t("upload")}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default Avatar;
