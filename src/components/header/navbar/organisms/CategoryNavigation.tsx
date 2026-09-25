"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { CategoryItem } from "../atoms";
import type { CategoryItem as CategoryItemType } from "../types";

export interface CategoryNavigationProps {
  /** List of categories to display */
  categories: readonly CategoryItemType[];
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
export const CategoryNavigation: FC<CategoryNavigationProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  className,
}) => {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ overflow: false, previous: false, next: false });

  const measureScroll = useCallback(() => {
    const viewport = containerRef.current;
    const scroller = scrollContainerRef.current;
    if (!viewport || !scroller) return;
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0;
    // Measure content independently of the arrows so resizing cannot toggle them endlessly.
    const contentWidth =
      Array.from(scroller.children).reduce(
        (width, child) => width + child.getBoundingClientRect().width,
        0
      ) +
      Math.max(0, scroller.children.length - 1) * gap;
    const position = Math.abs(scroller.scrollLeft);
    const next = {
      overflow: contentWidth > viewport.clientWidth + 1,
      previous: position > 1,
      next: position < scroller.scrollWidth - scroller.clientWidth - 1,
    };
    setScrollState((previous) =>
      previous.overflow === next.overflow &&
      previous.previous === next.previous &&
      previous.next === next.next
        ? previous
        : next
    );
  }, []);

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    const viewport = containerRef.current;
    if (!scroller || !viewport) return;
    const observer = new ResizeObserver(measureScroll);
    observer.observe(viewport);
    observer.observe(scroller);
    for (const child of scroller.children) observer.observe(child);
    measureScroll();
    return () => observer.disconnect();
  }, [measureScroll]);

  const scrollCategories = (direction: number) => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;
    const logicalDirection =
      getComputedStyle(scroller).direction === "rtl" ? -direction : direction;
    scroller.scrollBy({
      left: logicalDirection * scroller.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  // Scroll active category into view on mount or when activeCategory changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    const button = container?.querySelector<HTMLButtonElement>(
      `[data-category-id="${CSS.escape(activeCategory)}"]`
    );
    if (button && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      // Check if button is not fully visible
      if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
        button.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategory]);

  // Handle keyboard navigation between categories
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;
    const isRTL = getComputedStyle(e.currentTarget).direction === "rtl";

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = (currentIndex + (isRTL ? 1 : -1) + categories.length) % categories.length;
        break;
      case "ArrowRight":
        e.preventDefault();
        nextIndex = (currentIndex + (isRTL ? -1 : 1) + categories.length) % categories.length;
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
      scrollContainerRef.current
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        [nextIndex]?.focus();
      onCategoryChange(nextCategory.id);
    }
  };

  return (
    <div ref={containerRef} className="flex min-w-0 items-center gap-2">
      {scrollState.overflow && (
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          disabled={!scrollState.previous}
          aria-label={`${t("previous")} — ${t("category")}`}
          onClick={() => scrollCategories(-1)}
        >
          <ChevronLeft data-icon="inline-start" className="rtl:rotate-180" />
        </Button>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={measureScroll}
        role="tablist"
        aria-label="Category navigation"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-none",
          className
        )}
      >
        {categories.map((category, index) => {
          const isActive = category.id === activeCategory;

          return (
            <div className="shrink-0" key={category.id}>
              <CategoryItem
                id={category.id}
                label={category.label}
                icon={category.icon}
                isActive={isActive}
                tabIndex={
                  isActive ||
                  (index === 0 && !categories.some((item) => item.id === activeCategory))
                    ? 0
                    : -1
                }
                onClick={onCategoryChange}
                onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, index)}
              />
            </div>
          );
        })}
      </div>
      {scrollState.overflow && (
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          disabled={!scrollState.next}
          aria-label={`${t("next")} — ${t("category")}`}
          onClick={() => scrollCategories(1)}
        >
          <ChevronRight data-icon="inline-end" className="rtl:rotate-180" />
        </Button>
      )}
    </div>
  );
};
