'use client';

import React, { useCallback, useMemo, useRef, useEffect } from "react";

// Simple Search Icon component
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
    <path
      d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM13 13l-2-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface CategoryNavProps {
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  onSearch?: () => void;
  onFilter?: () => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory = "food",
  onCategoryChange,
  onSearch,
  onFilter,
}) => {
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  // Memoize categories to prevent recreation on every render
  // IDs match URL paths (plural form)
  // Order: Food basics → Community resources → Lifestyle → Engagement → Forum
  const categories = useMemo(
    () => [
      { id: "food", label: "Food", icon: "🍎", ariaLabel: "Browse food items" },
      { id: "things", label: "Things", icon: "🎁", ariaLabel: "Browse things" },
      { id: "borrow", label: "Borrow", icon: "🔧", ariaLabel: "Items to borrow" },
      { id: "wanted", label: "Wanted", icon: "📦", ariaLabel: "Wanted items" },
      { id: "foodbanks", label: "FoodBanks", icon: "🏠", ariaLabel: "Find food banks" },
      { id: "fridges", label: "Fridges", icon: "❄️", ariaLabel: "Community fridges" },
      { id: "zerowaste", label: "Zero Waste", icon: "♻️", ariaLabel: "Zero waste initiatives" },
      { id: "vegan", label: "Vegan", icon: "🌱", ariaLabel: "Vegan listings" },
      { id: "organisations", label: "Organisations", icon: "🏛️", ariaLabel: "Organisation listings" },
      { id: "volunteers", label: "Volunteers", icon: "🙌🏻", ariaLabel: "Volunteer opportunities" },
      { id: "challenges", label: "Challenges", icon: "🏆", ariaLabel: "Community challenges" },
      { id: "forum", label: "Forum", icon: "💬", ariaLabel: "Community forum" },
    ],
    []
  );

  // Scroll active item into view on mount or when active category changes
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const item = activeItemRef.current;
      const containerWidth = container.offsetWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;

      // Center the active item
      const scrollPosition = itemLeft - containerWidth / 2 + itemWidth / 2;
      container.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [activeCategory]);

  // Memoize callback to prevent recreation
  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      if (onCategoryChange) {
        onCategoryChange(categoryId);
      }
      // Open search modal when category is clicked
      if (onSearch) {
        onSearch();
      }
    },
    [onCategoryChange, onSearch]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, categoryId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCategoryClick(categoryId);
      }
    },
    [handleCategoryClick]
  );

  return (
    <nav role="navigation" aria-label="Category navigation" className="bg-background relative">
      <div className="max-w-full mx-auto px-7 xl:px-20 py-2 md:py-2.5 flex items-center justify-between gap-2 md:gap-4 border-b border-border">
        {/* Categories - Scrollable */}
        <ul
          ref={scrollContainerRef}
          role="tablist"
          className="flex-1 max-w-[calc(100%-180px)] md:max-w-[calc(100%-220px)] flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden list-none m-0 p-0 scrollbar-hide"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id;

            return (
              <li
                key={category.id}
                ref={isActive ? activeItemRef : null}
                role="tab"
                aria-selected={isActive}
                aria-label={category.ariaLabel}
                tabIndex={isActive ? 0 : -1}
                className="flex flex-col items-center gap-1 md:gap-1.5 min-w-fit px-2 md:px-3 cursor-pointer relative pb-2 md:pb-3 transition-all duration-200 ease-in-out transform translate-z-0 hover:-translate-y-0.5 active:-translate-y-1 active:transition-[transform_0.15s_ease-in-out] focus:outline-2 focus:outline-primary focus:outline-offset-4 focus:rounded-lg"
                onClick={() => handleCategoryClick(category.id)}
                onKeyDown={(e) => handleKeyDown(e, category.id)}
              >
                {/* Icon */}
                <div
                  className="text-2xl md:text-[29px] transition-all duration-200"
                  role="img"
                  aria-hidden="true"
                >
                  {category.icon}
                </div>

                {/* Label */}
                <span
                  className={`text-[9px] md:text-[10px] whitespace-nowrap transition-all duration-200 tracking-wider select-none ${
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {category.label}
                </span>

                {/* Screen reader only text */}
                <span className="sr-only">{isActive ? "Currently selected" : ""}</span>

                {/* Active Indicator - Bottom Border */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-0.5 bg-foreground rounded-t-sm transition-all duration-200" />
                )}
              </li>
            );
          })}
        </ul>

        {/* Search & Filter Buttons */}
        <div className="flex gap-1.5 md:gap-2 items-center flex-shrink-0">
          {/* Search Button */}
          <button
            role="button"
            aria-label="Open search"
            className="flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 border border-border rounded-[20px] cursor-pointer transition-all duration-200 bg-background min-w-[70px] md:min-w-[85px] hover:border-foreground hover:shadow-sm active:scale-[0.98] focus:outline-2 focus:outline-primary focus:outline-offset-2"
            onClick={onSearch}
          >
            <SearchIcon
              className="w-3.5 h-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-[11px] md:text-xs font-medium text-foreground">Search</span>
          </button>

          {/* Filter Button */}
          <button
            role="button"
            aria-label="Open filters"
            className="flex items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 border border-border rounded-[20px] cursor-pointer transition-all duration-200 bg-background min-w-[65px] md:min-w-[75px] hover:border-foreground hover:shadow-sm active:scale-[0.98] focus:outline-2 focus:outline-primary focus:outline-offset-2"
            onClick={onFilter}
          >
            {/* Filter Icon */}
            <svg width="14" height="14" fill="none" className="text-muted-foreground" aria-hidden="true">
              <path
                d="M2 4h12M4 8h8M6 12h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] md:text-xs font-medium text-foreground">Filter</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

// React Compiler handles memoization automatically
export default CategoryNav;
