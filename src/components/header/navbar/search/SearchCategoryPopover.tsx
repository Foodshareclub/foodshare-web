"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SearchCategoryOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SearchCategoryPopoverProps {
  searchId: string;
  selectedCategory: string;
  options: SearchCategoryOption[];
  labels: {
    selectCategory: string;
    category: string;
  };
  onSelectCategory: (categoryId: string) => void;
}

/**
 * Search category grid popover.
 */
export function SearchCategoryPopover({
  searchId,
  selectedCategory,
  options,
  labels,
  onSelectCategory,
}: SearchCategoryPopoverProps) {
  return (
    <section
      id={`${searchId}-category`}
      aria-labelledby={`${searchId}-category-trigger`}
      className={cn(
        "absolute top-[calc(100%+8px)] inset-x-0 z-20",
        "bg-background/95 text-foreground rounded-3xl border border-border/80 p-5 sm:p-6",
        "shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200",
        "max-h-[min(460px,60dvh)] overflow-y-auto overscroll-contain scrollbar-thin",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{labels.selectCategory}</h3>
        <span className="text-xs text-muted-foreground">{labels.category}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {options.map((category) => {
          const isSelected = selectedCategory === category.id;
          const Icon = category.icon;
          return (
            <button
              type="button"
              aria-pressed={isSelected}
              key={category.id}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-center",
                isSelected
                  ? "border-foreground bg-foreground/5 shadow-xs font-semibold text-foreground ring-1 ring-foreground"
                  : "border-border/70 hover:border-foreground/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSelectCategory(category.id)}
            >
              <Icon
                className={cn(
                  "size-6 transition-transform duration-200",
                  isSelected ? "text-foreground scale-110" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span className="text-xs font-medium truncate max-w-full">{category.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
