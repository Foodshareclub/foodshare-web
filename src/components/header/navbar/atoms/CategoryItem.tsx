import { memo, type FC } from "react";
import { cn } from "@/lib/utils";


export interface CategoryItemProps {
  /** Unique category identifier */
  id: string;
  /** Category display label */
  label: string;
  /** SVG icon as string or React element */
  icon?: string | React.ReactNode;
  /** Active/selected state */
  isActive?: boolean;
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
export const CategoryItem: FC<CategoryItemProps> = memo(
  ({ id, label, icon, isActive = false, onClick, onKeyDown: externalOnKeyDown, className }) => {
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
        aria-selected={isActive}
        aria-label={label}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-fit relative",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:scale-105 active:scale-95",
          "focus:outline focus:outline-2 focus:outline-primary focus:outline-offset-2 focus:rounded-lg",
          className
        )}
        style={{
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      >
        {icon && (
          <span
            className={cn(
              "text-xl md:text-2xl",
              "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isActive ? "scale-110" : "scale-100"
            )}
            role="img"
            aria-hidden="true"
            style={{ transform: "translateZ(0)", willChange: "transform" }}
          >
            {typeof icon === "string" ? icon : icon}
          </span>
        )}
        <span
          className={cn(
            "text-[10px] md:text-[11px] whitespace-nowrap tracking-wide select-none",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isActive
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground"
          )}
        >
          {label}
        </span>

        {/* Active Indicator - Bottom Border */}
        {isActive && (
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-full h-0.5 bg-primary rounded-t-sm"
            style={{
              transform: "translateX(-50%) translateZ(0)",
              willChange: "transform",
            }}
          />
        )}
      </button>
    );
  }
);

CategoryItem.displayName = "CategoryItem";
