'use client';

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Carousel from "../carousel/Carousel";
import type { PagesType } from "./navbar/types";
import FiltersModal from "@/components/modals/FiltersModal";
import CompactSearchButton from "./CompactSearchButton";
import SearchModal from "@/components/modals/SearchModal";


type SimpleBottomNavigationType = {
  pageType: PagesType;
  setPageType: (pageType: PagesType) => void;
  getRoute: (route: string) => void;
  productType: string;
  isCompact?: boolean;
};

const SimpleBottomNavigation: React.FC<SimpleBottomNavigationType> = ({
  getRoute,
  pageType,
  setPageType,
  productType,
  isCompact = false,
}) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "glass-subtle relative px-6 md:px-7 xl:px-20 gpu",
          "rounded-b-2xl",
          "transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCompact ? "py-2 md:py-2.5" : "py-3 md:py-4"
        )}
      >
        <div className="w-full flex items-center justify-between gap-2 md:gap-3">
          {/* Categories Carousel - Primary Discovery (Airbnb-style prominence) */}
          <div className="flex flex-1 min-w-0 overflow-hidden">
            <Carousel
              getRoute={getRoute}
              setPageType={setPageType}
              pageType={pageType}
              productType={productType}
              isCompact={isCompact}
            />
          </div>

          {/* Right Actions - Search + Filters (Secondary) */}
          <div className="flex gap-1.5 md:gap-2 items-center flex-shrink-0">
            <CompactSearchButton onClick={() => setIsSearchModalOpen(true)} />
            <FiltersModal />
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
};

export default SimpleBottomNavigation;
