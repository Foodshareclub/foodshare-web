import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryItemProps {
  /** Unique category identifier */
  id: string;
  /** Category display label */
  label: string;
  /** Lucide icon component */
  icon?: LucideIcon;
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
export function CategoryItem({
  id,
  label,
  icon,
  isActive = false,
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
      aria-selected={isActive}
      aria-label={label}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-fit relative",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus-visible:outline-none",
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
            "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isActive ? "scale-110 text-primary" : "scale-100 text-muted-foreground"
          )}
          aria-hidden="true"
          style={{ transform: "translateZ(0)", willChange: "transform" }}
        >
          {(() => {
            const Icon = icon;
            return <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.75} />;
          })()}
        </span>
      )}
      <span
        className={cn(
          "text-[10px] md:text-[11px] whitespace-nowrap tracking-wide select-none",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}
      >
        {label}
      </span>

      {/* Active Indicator - Bottom Border */}
      {isActive && (
        <div
          className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-primary rounded-t-sm"
          style={{
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        />
      )}
    </button>
  );
}
