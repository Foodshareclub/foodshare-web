'use client';

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CategoryNav } from "@/components/ui-library";
import type { PagesType } from "./navbar/types";
import SearchModal from "@/components/modals/SearchModal";

type CategoryFilterComponentProps = {
  pageType: PagesType;
  setPageType: (pageType: PagesType) => void;
  getRoute: (route: string) => void;
  productType: string;
  isCompact?: boolean;
};

const CategoryFilterComponent: React.FC<CategoryFilterComponentProps> = ({
  getRoute,
  setPageType,
  productType,
}) => {
  const router = useRouter();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Get active category from productType (which is already the plural URL value)
  // The productType comes from the URL and matches the category IDs in CategoryNav
  const activeCategory = productType.toLowerCase() || "food";

  // Handle category change
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      const routeName = categoryId.toLowerCase();
      // Update the URL to reflect the category
      router.push(`/${routeName}`);
      // Update internal state
      getRoute(routeName);
      setPageType("productComponent");
      // Open search modal when category is clicked
      setIsSearchModalOpen(true);
    },
    [router, getRoute, setPageType]
  );

  // Handle search
  const handleSearch = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  // Handle filter - this will be handled by FiltersModal
  const handleFilter = useCallback(() => {
    // FiltersModal handles its own state
  }, []);

  return (
    <>
      <div className="relative transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
        <CategoryNav
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          onSearch={handleSearch}
          onFilter={handleFilter}
        />
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
};

export default CategoryFilterComponent;
