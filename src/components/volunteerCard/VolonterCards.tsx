'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import navIcon from "@/assets/map.svg";
import type { AllValuesType } from "@/api/profileAPI";
import { StarIcon } from "@/utils/icons";
import HeartGrayImg from "@/assets/likesGray.svg";
import { GlassCard } from "@/components/Glass";

type VolunteerCardsProps = {
  volunteer: AllValuesType;
  indicator?: string;
};

// React Compiler handles memoization automatically
export function VolunteerCards({ volunteer, indicator }: VolunteerCardsProps) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const time = setTimeout(() => {
      // пока фото загрузятся skeleton
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(time);
  }, []);

  const id = volunteer.id;
  const onNavigateToOneProductHandler = () => router.push(`${id}`);

  return (
    <GlassCard variant="standard" padding="md" className="glass-fade-in" borderRadius="20px">
      {!isLoaded ? (
        <>
          <div className="rounded-full w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] mx-auto bg-muted animate-pulse" />
          <div>
            <div className="mt-4 h-5 bg-muted animate-pulse rounded-lg border-none" />
            <div className="mt-2 h-5 bg-muted animate-pulse rounded-lg" />
            <div className="mt-2 h-5 bg-muted animate-pulse rounded-lg" />
            <div className="mt-2 h-5 bg-muted animate-pulse rounded-lg" />
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <div className="text-center z-10 absolute">
              <button
                className="ml-10 cursor-pointer rounded-full p-2 border border-border bg-background"
                aria-label="volunteer"
              >
                <img src={HeartGrayImg.src} alt="like" style={{ filter: 'invert(27%) sepia(95%) saturate(6943%) hue-rotate(358deg) brightness(96%) contrast(117%)' }} />
              </button>
            </div>
            <img
              className="mx-auto relative rounded-full w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] object-cover cursor-pointer"
              onClick={indicator ? () => {} : onNavigateToOneProductHandler}
              src={
                volunteer.avatar_url ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23E2E8F0'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='40' fill='%23718096'%3E👤%3C/text%3E%3C/svg%3E"
              }
              alt={volunteer.first_name || "Volunteer"}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="mt-3">
            <div className="flex justify-between items-center text-2xl">
              <h3 className="text-xl font-body font-medium line-clamp-1">
                {volunteer.first_name.toUpperCase()}
              </h3>
              <StarIcon color="black" />
            </div>
            <div className="flex pt-3 justify-between items-center self-center">
              <p className="mt-1 text-sm text-muted-foreground uppercase">
                "{volunteer.user_address}"
              </p>
              <img className="cursor-pointer rounded-full" src={navIcon.src} alt="View on map" />
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}
