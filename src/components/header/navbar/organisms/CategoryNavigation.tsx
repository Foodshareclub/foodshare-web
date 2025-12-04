'use client';

import { memo, useRef, useEffect, type FC } from "react";
import { cn } from "@/lib/utils";
import { CategoryItem } from "../atoms";
import type { CategoryItem as CategoryItemType } from "../types";

export interface CategoryNavigationProps {
  /** List of categories to display */
  categories: CategoryItemType[];
  /** Currently active category ID */
  activeCategory: string;
  /** Category selection handler */
  onCategoryChange: (categoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CategoryNavigation Organism
 *
 * Horizontal scrollable category navigation bar.
 * Features keyboard navigation and smooth scrolling.
 *
 * @example
 * ```tsx
 * <CategoryNavigation
 *   categories={categories}
 *   activeCategory="food"
 *   onCategoryChange={handleCategoryChange}
 * />
 * ```
 */
export const CategoryNavigation: FC<CategoryNavigationProps> = memo(
  ({ categories, activeCategory, onCategoryChange, className }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeButtonRef = useRef<HTMLDivElement>(null);

    // Scroll active category into view on mount or when activeCategory changes
    useEffect(() => {
      if (activeButtonRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const button = activeButtonRef.current;
        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();

        // Check if button is not fully visible
        if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
          button.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    }, [activeCategory]);

    // Handle keyboard navigation between categories
    const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : categories.length - 1;
          break;
        case "ArrowRight":
          e.preventDefault();
          nextIndex = currentIndex < categories.length - 1 ? currentIndex + 1 : 0;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = categories.length - 1;
          break;
      }

      if (nextIndex !== null) {
        const nextCategory = categories[nextIndex];
        onCategoryChange(nextCategory.id);
        // Focus will be handled by the CategoryItem component
      }
    };

    return (
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Category navigation"
        className={cn(
          "flex items-center gap-2",
          "overflow-x-auto scrollbar-hide scroll-smooth",
          className
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {categories.map((category, index) => {
          const isActive = category.id === activeCategory;

          return (
            <div key={category.id} ref={isActive ? activeButtonRef : null}>
              <CategoryItem
                id={category.id}
                label={category.label}
                icon={category.icon}
                isActive={isActive}
                onClick={onCategoryChange}
                onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, index)}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

CategoryNavigation.displayName = "CategoryNavigation";
