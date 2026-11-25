"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface SearchDistanceOption {
  value: number | null;
  label: string;
}

interface SearchDistancePopoverProps {
  searchId: string;
  selectedRadius: number | null;
  locationError: boolean;
  options: SearchDistanceOption[];
  labels: {
    distanceFilter: string;
    clear: string;
    selectDistanceRange: string;
    locationErrorText: string;
  };
  onClear: () => void;
  onSelectRadius: (value: number | null) => void;
}

/**
 * Search distance filter popover with preset radius grid.
 */
export function SearchDistancePopover({
  searchId,
  selectedRadius,
  locationError,
  options,
  labels,
  onClear,
  onSelectRadius,
}: SearchDistancePopoverProps) {
  return (
    <section
      id={`${searchId}-distance`}
      aria-labelledby={`${searchId}-distance-trigger`}
      className={cn(
        "absolute top-[calc(100%+8px)] inset-x-0 z-20",
        "bg-background/95 text-foreground rounded-3xl border border-border/80 p-5 sm:p-6",
        "shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200",
        "max-h-[55dvh] overflow-y-auto overscroll-contain scrollbar-thin",
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{labels.distanceFilter}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          {labels.clear}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{labels.selectDistanceRange}</p>
      {locationError && (
        <p role="alert" className="mb-4 rounded-xl border border-border bg-muted p-3 text-xs text-foreground">
          {labels.locationErrorText}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {options.map((option) => {
          const isSelected = selectedRadius === option.value;
          return (
            <button
              type="button"
              aria-pressed={isSelected}
              key={option.value ?? "any"}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-center",
                isSelected
                  ? "border-foreground bg-foreground text-background font-semibold shadow-xs"
                  : "border-border/70 hover:border-foreground/30 hover:bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSelectRadius(option.value)}
            >
              <span className="text-xs font-medium truncate max-w-full">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
