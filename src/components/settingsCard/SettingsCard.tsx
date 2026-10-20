import { useRouter } from "next/navigation";
import type React from "react";

type SettingsCardType = {
  imgSRC: string;
  settingTitle: string;
  description: string;
  route: string;
};

export const SettingsCard: React.FC<SettingsCardType> = ({ imgSRC, settingTitle, description, route }) => {
  const router = useRouter();

  const onNavigateHandler = () => router.push(route);

  return (
    <div className="flex">
      <button
        type="button"
        className="glass rounded-xl p-5 ms-3 w-full cursor-pointer card-transition card-hover card-hover-glow text-start"
        onClick={onNavigateHandler}
      >
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSRC} alt={settingTitle} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
        </div>

        <p className="font-bold mb-2">{settingTitle}</p>

        <p className="text-sm mb-2">{description}</p>
      </button>
    </div>
  );
};
