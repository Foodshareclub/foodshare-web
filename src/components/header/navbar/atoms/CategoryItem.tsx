import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface CategoryItemProps {
  /** Unique category identifier */
  id: string;
  /** Category display label */
  label: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Active/selected state */
  isActive?: boolean;
  tabIndex?: number;
  /** Click handler */
  onClick: (id: string) => void;
  /** Optional keyboard event handler for arrow key navigation */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Atomic CategoryItem Component
 *
 * Individual category button for the navbar category navigation.
 * Optimized for horizontal scrolling and keyboard navigation.
 *
 * @example
 * ```tsx
 * <CategoryItem
 *   id="food"
 *   label="Food"
 *   icon={<FoodIcon />}
 *   isActive={selectedCategory === "food"}
 *   onClick={handleCategoryClick}
 * />
 * ```
 */
export function CategoryItem({
  id,
  label,
  icon: Icon,
  isActive = false,
  tabIndex,
  onClick,
  onKeyDown: externalOnKeyDown,
  className,
}: CategoryItemProps) {
  const handleClick = () => {
    onClick(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter/Space for activation
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(id);
    }
    // Call external handler for arrow key navigation
    externalOnKeyDown?.(e);
  };

  return (
    <button
      type="button"
      role="tab"
      data-category-id={id}
      aria-selected={isActive}
      aria-label={label}
      tabIndex={tabIndex ?? (isActive ? 0 : -1)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex min-h-14 min-w-14 flex-col items-center justify-center gap-1.5 px-3 py-2",
        "transition-all duration-200 motion-reduce:transition-none cursor-pointer",
        isActive
          ? "text-foreground font-semibold"
          : "text-muted-foreground font-medium opacity-70 hover:opacity-100 hover:text-foreground",
        "rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "transition-colors duration-200",
            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden="true"
        >
          <Icon className="size-5 md:size-6" strokeWidth={isActive ? 2 : 1.75} />
        </span>
      )}
      <span
        className={cn(
          "select-none whitespace-nowrap text-xs transition-colors duration-200",
          isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        {label}
      </span>

      {/* Airbnb Active Indicator - Bottom Border */}
      {isActive && <div className="absolute bottom-0 inset-x-2 h-0.5 bg-foreground rounded-full" />}
    </button>
  );
}
