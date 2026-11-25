"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getPostTypeConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { type FilterStatus, SORT_OPTIONS, STATUS_OPTIONS, type SortOption, USER_LISTINGS_COPY } from "./types";

interface FilterSheetContentProps {
  postTypes: string[];
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onClose: () => void;
}

function FilterSheetContent({
  postTypes,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  hasActiveFilters,
  onClearFilters,
  onClose,
}: FilterSheetContentProps) {
  return (
    <div className="space-y-4">
      {postTypes.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground mb-2 block">{USER_LISTINGS_COPY.typeLabel}</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onFilterTypeChange("all");
                onClose();
              }}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                filterType === "all"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {USER_LISTINGS_COPY.allLabel}
            </button>
            {postTypes.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => {
                  onFilterTypeChange(type);
                  onClose();
                }}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                  filterType === type
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {`${getPostTypeConfig(type).emoji} ${getPostTypeConfig(type).label}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="text-xs font-medium text-muted-foreground mb-2 block">{USER_LISTINGS_COPY.statusLabel}</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onFilterStatusChange(option.value);
                onClose();
              }}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                filterStatus === option.value
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {`${option.icon} ${option.label}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-medium text-muted-foreground mb-2 block">{USER_LISTINGS_COPY.sortByLabel}</span>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onSortByChange(option.value);
                onClose();
              }}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                sortBy === option.value
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {`${option.icon} ${option.label.split(" ")[0]}`}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={() => {
            onClearFilters();
            onClose();
          }}
          className="w-full mt-4 rounded-xl"
        >
          <X className="h-4 w-4 me-2" aria-hidden="true" />
          {USER_LISTINGS_COPY.clearAllFilters}
        </Button>
      )}
    </div>
  );
}

interface UserListingsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  postTypes: string[];
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  mobileFiltersOpen: boolean;
  onMobileFiltersOpenChange: (open: boolean) => void;
  filteredCount: number;
  totalCount: number;
}

/**
 * Search, type/status filter controls, sorting dropdown, and mobile filter sheet.
 */
export function UserListingsToolbar({
  searchQuery,
  onSearchChange,
  postTypes,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  hasActiveFilters,
  activeFilterCount,
  onClearFilters,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
  filteredCount,
  totalCount,
}: UserListingsToolbarProps) {
  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy);
  const currentStatus = STATUS_OPTIONS.find((o) => o.value === filterStatus);

  return (
    <div className="mb-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72 order-1">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={USER_LISTINGS_COPY.searchPlaceholder}
            aria-label={USER_LISTINGS_COPY.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 ps-11 pe-10 rounded-xl border-border/50 bg-background/80 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all duration-200"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label={USER_LISTINGS_COPY.clearSearchLabel}
              onClick={() => onSearchChange("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={onMobileFiltersOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="lg:hidden h-11 gap-2 rounded-xl border-border/50 bg-background/80 order-2"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {USER_LISTINGS_COPY.filtersLabel}
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="mb-6">
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                {USER_LISTINGS_COPY.filterSortTitle}
              </SheetTitle>
            </SheetHeader>
            <FilterSheetContent
              postTypes={postTypes}
              filterType={filterType}
              onFilterTypeChange={onFilterTypeChange}
              filterStatus={filterStatus}
              onFilterStatusChange={onFilterStatusChange}
              sortBy={sortBy}
              onSortByChange={onSortByChange}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={onClearFilters}
              onClose={() => onMobileFiltersOpenChange(false)}
            />
          </SheetContent>
        </Sheet>

        {postTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border order-3",
                  filterType !== "all" &&
                    "border-emerald-500/50 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
                )}
              >
                <span>
                  {filterType === "all"
                    ? USER_LISTINGS_COPY.allTypesBadge
                    : `${getPostTypeConfig(filterType).emoji} ${getPostTypeConfig(filterType).label}`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-2">
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
                {USER_LISTINGS_COPY.filterByType}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFilterTypeChange("all")} className="gap-3 rounded-lg cursor-pointer">
                <span className="text-base">{USER_LISTINGS_COPY.allTypesIcon}</span>
                <span className="flex-1 font-medium">{USER_LISTINGS_COPY.allTypesItem}</span>
                {filterType === "all" && <Check className="h-4 w-4 text-emerald-600" />}
              </DropdownMenuItem>
              {postTypes.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onFilterTypeChange(type)}
                  className="gap-3 rounded-lg cursor-pointer"
                >
                  <span className="text-base">{getPostTypeConfig(type).emoji}</span>
                  <span className="flex-1 font-medium">{getPostTypeConfig(type).label}</span>
                  {filterType === type && <Check className="h-4 w-4 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border order-4",
                filterStatus !== "all" &&
                  "border-emerald-500/50 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
              )}
            >
              <span>{`${currentStatus?.icon ?? ""} ${currentStatus?.label ?? ""}`}</span>
              <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 p-2">
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
              {USER_LISTINGS_COPY.filterByStatus}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFilterStatusChange(option.value)}
                className="gap-3 rounded-lg cursor-pointer"
              >
                <span className="text-base">{option.icon}</span>
                <span className="flex-1 font-medium">{option.label}</span>
                {filterStatus === option.value && <Check className="h-4 w-4 text-emerald-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="hidden lg:flex h-11 gap-2 rounded-xl border-border/50 bg-background/80 px-4 font-medium transition-all duration-200 hover:bg-background hover:border-border order-5"
            >
              <span>{`${currentSort?.icon ?? ""} ${currentSort?.label.split(" ")[0] ?? ""}`}</span>
              <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 p-2">
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2">
              {USER_LISTINGS_COPY.sortListingsLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortByChange(option.value)}
                className="gap-3 rounded-lg cursor-pointer"
              >
                <span className="text-base">{option.icon}</span>
                <span className="flex-1 font-medium">{option.label}</span>
                {sortBy === option.value && <Check className="h-4 w-4 text-emerald-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="hidden lg:flex h-11 gap-2 rounded-xl px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 order-6"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {USER_LISTINGS_COPY.clearShort}
            <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          </Button>
        )}

        <div className="ms-auto flex items-center gap-2 order-last">
          <Badge variant="outline" className="h-7 px-3 font-medium tabular-nums">
            {`${filteredCount} ${USER_LISTINGS_COPY.ofConnector} ${totalCount}`}
          </Badge>
        </div>
      </div>
    </div>
  );
}
