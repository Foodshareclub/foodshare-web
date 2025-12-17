import React from "react";
import { useRouter } from "next/navigation";

type SettingsCardType = {
  imgSRC: string;
  settingTitle: string;
  description: string;
  route: string;
};

export const SettingsCard: React.FC<SettingsCardType> = ({
  imgSRC,
  settingTitle,
  description,
  route,
}) => {
  const router = useRouter();

  const onNavigateHandler = () => router.push(route);

  return (
    <div className="flex">
      <div
        className="glass rounded-xl p-5 ml-3 w-full cursor-pointer card-transition card-hover card-hover-glow"
        onClick={onNavigateHandler}
      >
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSRC}
            alt={settingTitle}
            className="w-12 h-12 rounded-full"
            loading="lazy"
            decoding="async"
          />
        </div>

        <p className="font-bold mb-2">{settingTitle}</p>

        <p className="text-sm mb-2">{description}</p>
      </div>
    </div>
  );
};
