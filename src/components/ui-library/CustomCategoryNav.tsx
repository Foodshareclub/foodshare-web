'use client';

import React, { useCallback, useRef, useEffect } from "react";

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

export interface Category {
  id: string;
  label: string;
  icon: React.ReactNode | string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface CustomCategoryNavProps {
  categories: Category[];
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  onSearch?: () => void;
  onFilter?: () => void;
  showSearch?: boolean;
  showFilter?: boolean;
  isLoading?: boolean;
}

export const CustomCategoryNav: React.FC<CustomCategoryNavProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  onSearch,
  onFilter,
  showSearch = true,
  showFilter = true,
  isLoading = false,
}) => {
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  // Auto-scroll to active category
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const item = activeItemRef.current;
      const containerWidth = container.offsetWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;

      const scrollPosition = itemLeft - containerWidth / 2 + itemWidth / 2;
      container.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [activeCategory]);

  // Memoized handlers
  const handleCategoryClick = useCallback(
    (categoryId: string, disabled?: boolean) => {
      if (!disabled && onCategoryChange) {
        onCategoryChange(categoryId);
      }
    },
    [onCategoryChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, categoryId: string, disabled?: boolean) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        handleCategoryClick(categoryId);
      }
    },
    [handleCategoryClick]
  );

  return (
    <nav
      role="navigation"
      aria-label="Category navigation"
      className="bg-background border-b border-border sticky top-0 z-10 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Categories */}
        <ul
          ref={scrollContainerRef}
          role="tablist"
          className="flex-1 flex gap-5 md:gap-6 overflow-x-auto overflow-y-hidden list-none m-0 p-0 scrollbar-hide"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            const isDisabled = category.disabled || isLoading;

            return (
              <li
                key={category.id}
                ref={isActive ? activeItemRef : null}
                role="tab"
                aria-selected={isActive}
                aria-label={category.ariaLabel || category.label}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : isActive ? 0 : -1}
                className={`flex flex-col items-center gap-2 min-w-[60px] cursor-pointer relative pb-2 transition-all duration-200 ease-in-out ${
                  isDisabled ? "opacity-40 cursor-not-allowed" : ""
                } ${isActive ? "scale-100" : "scale-[0.98]"} hover:scale-100 focus:outline-2 focus:outline-primary focus:outline-offset-4 focus:rounded-lg`}
                onClick={() => handleCategoryClick(category.id, isDisabled)}
                onKeyDown={(e) => handleKeyDown(e, category.id, isDisabled)}
              >
                {/* Icon */}
                <div
                  className={`text-xl md:text-2xl transition-all duration-200 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                  role="img"
                  aria-hidden="true"
                >
                  {typeof category.icon === "string" ? (
                    <span className="text-2xl md:text-[29px]">{category.icon}</span>
                  ) : (
                    category.icon
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] md:text-xs whitespace-nowrap transition-all duration-200 select-none ${
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {category.label}
                </span>

                {/* Screen reader text */}
                <span className="sr-only">
                  {isActive ? "Currently selected" : ""}
                  {isDisabled ? "Disabled" : ""}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-sm transition-all duration-200" />
                )}
              </li>
            );
          })}
        </ul>

        {/* Search & Filter Buttons */}
        <div className="flex gap-3 items-center flex-shrink-0">
          {showSearch && (
            <button
              role="button"
              aria-label="Open search"
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-border rounded-3xl cursor-pointer transition-all duration-200 bg-background hover:border-foreground hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm focus:outline-2 focus:outline-primary focus:outline-offset-2"
              onClick={onSearch}
            >
              <SearchIcon className="text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:block text-xs md:text-sm font-medium text-foreground">
                Search
              </span>
            </button>
          )}

          {showFilter && (
            <button
              role="button"
              aria-label="Open filters"
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-border rounded-3xl cursor-pointer transition-all duration-200 bg-background hover:border-foreground hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm focus:outline-2 focus:outline-primary focus:outline-offset-2"
              onClick={onFilter}
            >
              <svg width="16" height="16" fill="none" className="text-muted-foreground" aria-hidden="true">
                <path
                  d="M2 4h12M4 8h8M6 12h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="hidden sm:block text-xs md:text-sm font-medium text-foreground">
                Filter
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

// React Compiler handles memoization automatically
export default CustomCategoryNav;
