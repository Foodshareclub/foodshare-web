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
        className="glass rounded-xl p-5 ml-3 w-full cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_12px_20px_rgba(0,0,0,0.15)]"
        onClick={onNavigateHandler}
      >
        <div className="mb-2">
          <img src={imgSRC} alt={settingTitle} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
        </div>

        <p className="font-bold mb-2">{settingTitle}</p>

        <p className="text-sm mb-2">{description}</p>
      </div>
    </div>
  );
};
