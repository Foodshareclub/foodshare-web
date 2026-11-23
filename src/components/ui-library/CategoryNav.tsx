"use client";

import { CATEGORIES } from "@/constants/categories";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";

// Simple Search Icon component
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("categories");

  // Scroll active item into view on mount or when active category changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeCategory is the trigger — the active node is tracked through activeItemRef, and each category change must re-centre the nav
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
    [onCategoryChange, onSearch],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, categoryId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCategoryClick(categoryId);
      }
    },
    [handleCategoryClick],
  );

  return (
    <nav aria-label="Category navigation" className="bg-background relative">
      <div className="max-w-full mx-auto px-7 xl:px-20 py-2 md:py-2.5 flex items-center justify-between gap-2 md:gap-4 border-b border-border">
        {/* Categories - Scrollable */}
        <div
          ref={scrollContainerRef}
          role="tablist"
          className="flex-1 max-w-[calc(100%-180px)] md:max-w-[calc(100%-220px)] flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden list-none m-0 p-0 scrollbar-hide"
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            // labelKey is "categories.food" -> extract just "food"
            const translationKey = category.labelKey.replace("categories.", "");
            const label = t(translationKey);

            return (
              <div
                key={category.id}
                ref={isActive ? activeItemRef : null}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                tabIndex={isActive ? 0 : -1}
                className="flex flex-col items-center gap-1 md:gap-1.5 min-w-fit px-2 md:px-3 cursor-pointer relative pb-2 md:pb-3 transition-all duration-200 ease-in-out transform translate-z-0 hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-lg"
                onClick={() => handleCategoryClick(category.id)}
                onKeyDown={(e) => handleKeyDown(e, category.id)}
              >
                {/* Icon */}
                <div
                  className={`transition-all duration-200 ${isActive ? "text-brand" : "text-muted-foreground hover:text-foreground"}`}
                  aria-hidden="true"
                >
                  <category.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.75} />
                </div>

                {/* Label */}
                <span
                  className={`text-[9px] md:text-[10px] whitespace-nowrap transition-all duration-200 tracking-wider select-none ${
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {label}
                </span>

                {/* Screen reader only text */}
                <span className="sr-only">{isActive ? "Currently selected" : ""}</span>

                {/* Active Indicator - Bottom Border */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-2 h-0.5 bg-foreground rounded-full transition-all duration-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* Search & Filter Buttons */}
        <div className="flex gap-1.5 md:gap-2 items-center flex-shrink-0">
          {/* Search Button */}
          <button
            type="button"
            aria-label="Open search"
            className="flex items-center justify-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 border border-border/80 rounded-full cursor-pointer transition-all duration-200 bg-background/80 hover:bg-muted/40 hover:border-foreground/40 shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={onSearch}
          >
            <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] md:text-xs font-medium text-foreground">Search</span>
          </button>

          {/* Filter Button */}
          <button
            type="button"
            aria-label="Open filters"
            className="flex items-center justify-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 border border-border/80 rounded-full cursor-pointer transition-all duration-200 bg-background/80 hover:bg-muted/40 hover:border-foreground/40 shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={onFilter}
          >
            {/* Filter Icon */}
            <svg width="14" height="14" fill="none" className="text-muted-foreground" aria-hidden="true">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
