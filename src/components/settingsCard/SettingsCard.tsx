import React from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/Glass";

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
      <GlassCard
        variant="standard"
        padding="md"
        ml="3"
        w="100%"
        cursor="pointer"
        onClick={onNavigateHandler}
        className="transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-[0_12px_20px_rgba(0,0,0,0.15)]"
      >
        <div className="mb-2">
          <img src={imgSRC} alt={settingTitle} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
        </div>

        <p className="font-bold mb-2">{settingTitle}</p>

        <p className="text-sm mb-2">{description}</p>
      </GlassCard>
    </div>
  );
};
