'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// React Compiler handles memoization automatically
export default function CategoryFilterComponent({
  getRoute,
  setPageType,
  productType,
}: CategoryFilterComponentProps) {
  const router = useRouter();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Get active category from productType (which is already the plural URL value)
  const activeCategory = productType.toLowerCase() || "food";

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    const routeName = categoryId.toLowerCase();
    router.push(`/${routeName}`);
    getRoute(routeName);
    setPageType("productComponent");
    setIsSearchModalOpen(true);
  };

  // Handle search
  const handleSearch = () => {
    setIsSearchModalOpen(true);
  };

  // Handle filter - FiltersModal handles its own state
  const handleFilter = () => {
    // No-op: FiltersModal handles its own state
  };

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
}
