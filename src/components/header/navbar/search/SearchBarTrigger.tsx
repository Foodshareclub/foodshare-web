"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { SEARCH_POPOVER_COPY } from "./constants";

interface SearchBarTriggerProps {
  isCompact: boolean;
  searchId: string;
  activeSection: string | null;
  searchTerm: string;
  selectedDistance: string;
  categoryLabel: string;
  canSearchNearby: boolean;
  isHovered: boolean;
  isBusy: boolean;
  onHoverChange: (hovered: boolean) => void;
  onCompactClick: () => void;
  onToggleSection: (section: "what" | "distance" | "category") => void;
  onSubmit: () => void;
  labels: {
    searchHeader: string;
    whatPlaceholder: string;
    what: string;
    distance: string;
    selectDistanceRange: string;
    category: string;
    search: string;
  };
}

/**
 * Compact mobile button and desktop 3-part pill bar for Navbar search.
 */
export function SearchBarTrigger({
  isCompact,
  searchId,
  activeSection,
  searchTerm,
  selectedDistance,
  categoryLabel,
  canSearchNearby,
  isHovered,
  isBusy,
  onHoverChange,
  onCompactClick,
  onToggleSection,
  onSubmit,
  labels,
}: SearchBarTriggerProps) {
  if (isCompact) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-14 w-full justify-start gap-3 rounded-full px-3 text-start shadow-sm motion-reduce:transition-none hover:shadow-md transition-shadow"
        onClick={onCompactClick}
        aria-label={labels.searchHeader}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-xs">
          <Search className="size-4.5" aria-hidden="true" />
        </div>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{searchTerm || labels.searchHeader}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{labels.whatPlaceholder}</span>
        </span>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center overflow-hidden rounded-full border bg-background/80 backdrop-blur-xl backdrop-saturate-150 shadow-sm",
        "transition-all duration-300 motion-reduce:transition-none",
        isHovered || activeSection ? "border-foreground/30 shadow-md" : "border-border/50",
      )}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <Button
        type="button"
        variant="ghost"
        data-search-field="what"
        id={`${searchId}-what-trigger`}
        aria-controls={activeSection === "what" ? `${searchId}-what` : undefined}
        aria-expanded={activeSection === "what"}
        className={cn(
          "flex h-14 min-w-0 flex-[1.5] flex-col items-start justify-center gap-0.5 rounded-full ps-4 pe-2 text-start sm:h-14 sm:px-5 cursor-pointer transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          activeSection === "what" ? "bg-muted shadow-xs" : "hover:bg-muted/40",
        )}
        onClick={() => onToggleSection("what")}
      >
        <span className="hidden text-xs font-semibold sm:block">{labels.what}</span>
        <span className="w-full truncate text-sm font-normal text-muted-foreground">
          {searchTerm || labels.searchHeader}
        </span>
        <span className="w-full truncate text-xs font-normal text-muted-foreground sm:hidden">
          {categoryLabel} · {selectedDistance}
        </span>
      </Button>

      {canSearchNearby && <div className="h-8 w-px shrink-0 bg-border" />}

      {canSearchNearby && (
        <Button
          type="button"
          variant="ghost"
          aria-label={`${labels.distance}: ${selectedDistance || labels.selectDistanceRange}`}
          data-search-field="distance"
          id={`${searchId}-distance-trigger`}
          aria-controls={activeSection === "distance" ? `${searchId}-distance` : undefined}
          aria-expanded={activeSection === "distance"}
          className={cn(
            "flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-start sm:h-14 sm:w-auto sm:min-w-0 sm:flex-1 sm:items-start sm:px-5 cursor-pointer transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            activeSection === "distance" ? "bg-muted shadow-xs" : "hover:bg-muted/40",
          )}
          onClick={() => onToggleSection("distance")}
        >
          <MapPin data-icon="inline-start" className="sm:hidden" />
          <span className="hidden text-xs font-semibold sm:block">{labels.distance}</span>
          <span className="hidden w-full truncate text-sm font-normal text-muted-foreground sm:block">
            {selectedDistance || SEARCH_POPOVER_COPY.placeholderDash}
          </span>
        </Button>
      )}

      <div className="h-8 w-px shrink-0 bg-border" />

      <Button
        type="button"
        variant="ghost"
        data-search-field="category"
        id={`${searchId}-category-trigger`}
        aria-controls={activeSection === "category" ? `${searchId}-category` : undefined}
        aria-expanded={activeSection === "category"}
        aria-label={`${labels.category}: ${categoryLabel}`}
        className={cn(
          "flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-start sm:h-14 sm:w-auto sm:min-w-0 sm:flex-1 sm:items-start sm:px-5 cursor-pointer transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          activeSection === "category" ? "bg-muted shadow-xs" : "hover:bg-muted/40",
        )}
        onClick={() => onToggleSection("category")}
      >
        <SlidersHorizontal data-icon="inline-start" className="sm:hidden" />
        <span className="hidden text-xs font-semibold sm:block">{labels.category}</span>
        <span className="hidden w-full truncate text-sm font-normal text-muted-foreground sm:block">
          {categoryLabel}
        </span>
      </Button>

      <Button
        type="button"
        variant="brand"
        size="icon-lg"
        aria-label={labels.search}
        className="me-2 size-11 shrink-0 rounded-full shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 motion-reduce:transition-none"
        disabled={isBusy}
        aria-busy={isBusy}
        onClick={onSubmit}
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
