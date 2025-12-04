import React, { memo, useCallback } from "react";
import AliceCarousel from "react-alice-carousel";
import "react-alice-carousel/lib/alice-carousel.css";
import { navigationActionsSVG, responsive } from "@/utils/navigationActions";
import { useRouter } from "next/navigation";
import type { PagesType } from "@/components/header/navbar/types";
import { ItemsForCarousel } from "@/components";
import "./Carousel.css";

type PropsType = {
  getRoute: (route: string) => void;
  pageType: PagesType;
  setPageType: (isMainPage: PagesType) => void;
  productType: string;
  isCompact?: boolean;
};

const Carousel: React.FC<PropsType> = memo(({
  getRoute,
  setPageType,
  pageType,
  productType,
  isCompact = false,
}) => {
  const router = useRouter();
  const navigateHandler = useCallback((name: string) => {
    const routeName = name.toLowerCase();
    router.push(`${routeName === "food" ? "/food" : routeName}`);
    getRoute(routeName);
    setPageType("productComponent");
  }, [router, getRoute, setPageType]);

  return (
    <AliceCarousel
      responsive={responsive}
      controlsStrategy="responsive"
      disableButtonsControls={true}
      keyboardNavigation={true}
      disableDotsControls={true}
      infinite
      activeIndex={0}
      animationDuration={100}
      touchTracking={true}
      items={navigationActionsSVG.map((item, id) => (
        <ItemsForCarousel
          key={id}
          item={item}
          navigateHandler={navigateHandler}
          pageType={pageType}
          productType={productType}
          isCompact={isCompact}
        />
      ))}
    />
  );
});

Carousel.displayName = "Carousel";

export default Carousel;
