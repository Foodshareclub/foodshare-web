"use client";

import { useRouter } from "next/navigation";
import { navigationActionsSVG } from "@/utils/navigationActions";
import type { PagesType } from "@/components/header/navbar/types";
import { ItemsForCarousel } from "@/components";

type PropsType = {
  getRoute: (route: string) => void;
  pageType: PagesType;
  setPageType: (isMainPage: PagesType) => void;
  productType: string;
  isCompact?: boolean;
};

export default function Carousel({
  getRoute,
  setPageType,
  pageType,
  productType,
  isCompact = false,
}: PropsType) {
  const router = useRouter();

  const navigateHandler = (name: string) => {
    const routeName = name.toLowerCase();
    router.push(`${routeName === "food" ? "/food" : routeName}`);
    getRoute(routeName);
    setPageType("productComponent");
  };

  return (
    <div
      className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-2 md:gap-2.5 lg:gap-3 pb-2 -mx-4 px-4 cursor-grab active:cursor-grabbing"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {navigationActionsSVG.map((item, id) => (
        <div key={id} className="snap-start shrink-0">
          <ItemsForCarousel
            item={item}
            navigateHandler={navigateHandler}
            pageType={pageType}
            productType={productType}
            isCompact={isCompact}
          />
        </div>
      ))}
    </div>
  );
}
