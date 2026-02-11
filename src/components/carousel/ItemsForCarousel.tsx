import type { FC } from "react";
import React from "react";
import Image from "next/image";
import type { NavigationActionsSVGType } from "@/utils/navigationActions";

type ItemsForCarouselType = {
  productType: string;
  item: NavigationActionsSVGType;
  pageType: string;
  navigateHandler: (name: string) => void;
  isCompact?: boolean;
};

const ItemsForCarousel: FC<ItemsForCarouselType> = ({
  productType,
  item,
  pageType,
  navigateHandler,
  isCompact = false,
}) => {
  const changeAttributeValue = (v1: string, v2: string): string => {
    if (productType === item.nameForUrl.toLowerCase() && pageType === "productComponent") {
      return v1;
    } else return v2;
  };

  const isActive = productType === item.nameForUrl.toLowerCase() && pageType === "productComponent";

  return (
    <div
      className={`${isActive ? "glass-subtle" : "glass"} cursor-pointer rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative ${
        isCompact
          ? "min-w-[80px] md:min-w-[96px] px-2.5 md:px-3 py-1.5 md:py-2"
          : "min-w-[80px] md:min-w-[96px] px-3 md:px-4 py-2 md:py-3"
      } ${
        isActive ? "hover:bg-primary/10" : "hover:bg-muted"
      } hover:-translate-y-px active:translate-y-0 active:bg-muted`}
      onClick={() => navigateHandler(item.nameForUrl)}
    >
      <div className="text-center relative group">
        {/* Enhanced Icon Size - Airbnb-style prominence with scroll compaction */}
        <Image
          className={`m-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCompact
              ? "w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
              : "w-7 h-7 md:w-9 md:h-9 lg:w-10 lg:h-10"
          } ${isActive ? "opacity-100" : "opacity-85"} group-hover:scale-105`}
          src={changeAttributeValue(item.red, item.src)}
          alt={item.name}
          width={40}
          height={40}
          loading="lazy"
        />

        {/* Category Label */}
        <p
          className={`line-clamp-1 mb-0 pb-0 text-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCompact ? "mt-1 md:mt-1.5" : "mt-1.5 md:mt-2"
          } ${isActive ? "text-primary font-semibold tracking-tight" : "text-muted-foreground font-medium"} text-xs sm:text-sm`}
        >
          {item.name}
        </p>

        {/* Airbnb-style Active Underline */}
        {isActive && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-[80%] h-[3px] bg-primary rounded-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isCompact ? "-bottom-[8px]" : "-bottom-[10px]"
            }`}
          />
        )}
      </div>
    </div>
  );
};

export default ItemsForCarousel;
