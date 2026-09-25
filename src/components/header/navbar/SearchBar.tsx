"use client";

/**
 * Enhanced SearchBar Component with Real-time Suggestions
 *
 * Features:
 * - Real-time search suggestions
 * - Search history with localStorage
 * - Popular searches by category
 * - Debounced input (300ms)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Responsive search fields and keyboard-operable choices
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/constants/categories";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { cn } from "@/lib/utils";
import {
  buildListingSearchUrl,
  parseSearchLocation,
  parseSearchRadius,
  supportsNearbySearch,
} from "@/lib/listing-search";
import { useUIStore } from "@/store/zustand/useUIStore";
import { SearchIcon } from "@/utils/icons";
import { useTranslations } from "next-intl";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

interface SearchBarProps {
  isCompact?: boolean;
  onSearchClick: () => void;
  defaultCategory?: string;
}

function SearchBar({ isCompact = false, onSearchClick, defaultCategory = "all" }: SearchBarProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locationAttempt = useRef(0);
  useEffect(
    () => () => {
      locationAttempt.current += 1;
    },
    []
  );

  // Selected values for display
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const [locationError, setLocationError] = useState(false);
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const selectedDistance =
    selectedRadius === null ? t("search_filters.any_distance") : `${selectedRadius / 1000} km`;
  const canSearchNearby = supportsNearbySearch(selectedCategory);
  const categoryDefinition = CATEGORIES.find((category) => category.id === selectedCategory);
  const categoryLabel = categoryDefinition
    ? t(categoryDefinition.labelKey)
    : t.has("forum_all_categories")
      ? t("forum_all_categories")
      : "All categories";

  // Search suggestions hook
  const {
    searchTerm,
    setSearchTerm,
    suggestions,
    isLoading,
    recentSearches,
    handleSearch,
    removeFromHistory,
    clearHistory,
  } = useSearchSuggestions({
    category: selectedCategory,
    minLength: 2,
    maxSuggestions: 8,
    debounceMs: 300,
  });

  const appliedTerm = searchParams.get("key_word") || "";
  const appliedCategory =
    searchParams.get("type") === "all"
      ? "all"
      : defaultCategory === "business"
        ? "organisation"
        : defaultCategory;
  const appliedRadius = searchParams.get("radius");
  const appliedDistance = searchParams.get("distance");
  useEffect(() => {
    locationAttempt.current += 1;
    setIsLocating(false);
    setSearchTerm(appliedTerm);
    setSelectedCategory(appliedCategory);
    setSelectedRadius(
      appliedDistance === "any" || !appliedRadius ? null : parseSearchRadius(appliedRadius)
    );
  }, [appliedTerm, appliedCategory, appliedRadius, appliedDistance, setSearchTerm]);

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveSection(null);
        setSelectedIndex(-1);
      }
    };

    if (activeSection) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [activeSection]);

  // Handle search submission
  const handleSearchSubmit = async (term?: string) => {
    if (isLocating || isNavigating) return;
    const attempt = ++locationAttempt.current;
    const searchValue = (term ?? searchTerm).trim();
    setLocationError(false);
    let location = parseSearchLocation(searchParams);
    if (!location && userLocation)
      location = { lat: userLocation.latitude, lng: userLocation.longitude };

    if (selectedRadius !== null && canSearchNearby && !location) {
      setIsLocating(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("Geolocation unavailable"));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 300000,
          });
        });
        if (attempt !== locationAttempt.current) return;
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation({ latitude: location.lat, longitude: location.lng });
      } catch {
        if (attempt !== locationAttempt.current) return;
        setLocationError(true);
        setActiveSection("distance");
        containerRef.current
          ?.querySelector<HTMLButtonElement>('[data-search-field="distance"]')
          ?.focus();
        return;
      } finally {
        if (attempt === locationAttempt.current) setIsLocating(false);
      }
    }
    if (searchValue) handleSearch(searchValue);
    startNavigation(() => {
      router.push(
        buildListingSearchUrl({
          category: selectedCategory,
          term: searchValue,
          radius: selectedRadius,
          location,
        })
      );
    });
    setActiveSection(null);
    setSearchTerm(searchValue);
    setSelectedIndex(-1);
    containerRef.current?.querySelector<HTMLButtonElement>('[data-search-field="what"]')?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeSection || activeSection !== "what") return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSearchSubmit(suggestions[selectedIndex].text);
        } else {
          handleSearchSubmit();
        }
        break;
      case "Escape":
        e.preventDefault();
        setActiveSection(null);
        setSelectedIndex(-1);
        break;
    }
  };

  // Keep the compact action readable at phone widths.
  if (isCompact) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-14 w-full justify-start gap-3 rounded-full px-4 text-start shadow-sm motion-reduce:transition-none"
        onClick={() => {
          setActiveSection("what");
          onSearchClick();
        }}
        aria-label={t("msgsearchheader")}
      >
        <SearchIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            {searchTerm || t("msgsearchheader")}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {t("what_are_you_looking_for")}
          </span>
        </span>
      </Button>
    );
  }

  return (
    <div
      className="relative w-full"
      ref={containerRef}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || !activeSection) return;
        event.preventDefault();
        event.stopPropagation();
        containerRef.current
          ?.querySelector<HTMLButtonElement>(`[data-search-field="${activeSection}"]`)
          ?.focus();
        setActiveSection(null);
        setSelectedIndex(-1);
      }}
    >
      <div
        className={cn(
          "relative flex items-center overflow-hidden rounded-full border bg-background shadow-sm",
          "transition-colors motion-reduce:transition-none",
          isHovered || activeSection ? "border-foreground/40" : "border-border"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Button
          type="button"
          variant="ghost"
          data-search-field="what"
          id={`${searchId}-what-trigger`}
          aria-controls={activeSection === "what" ? `${searchId}-what` : undefined}
          aria-expanded={activeSection === "what"}
          className={cn(
            "flex h-14 min-w-0 flex-[1.5] flex-col items-start justify-center gap-0.5 rounded-none ps-4 pe-2 text-start sm:h-16 sm:px-5",
            activeSection === "what" && "bg-muted"
          )}
          onClick={() => setActiveSection(activeSection === "what" ? null : "what")}
        >
          <span className="hidden text-xs font-semibold sm:block">{t("what")}</span>
          <span className="w-full truncate text-sm font-normal text-muted-foreground">
            {searchTerm || t("msgsearchheader")}
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
            aria-label={`${t("distance")}: ${selectedDistance || t("select_distance_range")}`}
            data-search-field="distance"
            id={`${searchId}-distance-trigger`}
            aria-controls={activeSection === "distance" ? `${searchId}-distance` : undefined}
            aria-expanded={activeSection === "distance"}
            className={cn(
              "flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-none px-2 text-start sm:h-16 sm:w-auto sm:min-w-0 sm:flex-1 sm:items-start sm:px-5",
              activeSection === "distance" && "bg-muted"
            )}
            onClick={() => setActiveSection(activeSection === "distance" ? null : "distance")}
          >
            <MapPin data-icon="inline-start" className="sm:hidden" />
            <span className="hidden text-xs font-semibold sm:block">{t("distance")}</span>
            <span className="hidden w-full truncate text-sm font-normal text-muted-foreground sm:block">
              {selectedDistance || "—"}
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
          aria-label={`${t("category")}: ${categoryLabel}`}
          className={cn(
            "flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-none px-2 text-start sm:h-16 sm:w-auto sm:min-w-0 sm:flex-1 sm:items-start sm:px-5",
            activeSection === "category" && "bg-muted"
          )}
          onClick={() => setActiveSection(activeSection === "category" ? null : "category")}
        >
          <SlidersHorizontal data-icon="inline-start" className="sm:hidden" />
          <span className="hidden text-xs font-semibold sm:block">{t("category")}</span>
          <span className="hidden w-full truncate text-sm font-normal text-muted-foreground sm:block">
            {categoryLabel}
          </span>
        </Button>

        <Button
          type="button"
          size="icon-lg"
          aria-label={t("search")}
          className="me-2 shrink-0 rounded-full"
          disabled={isLocating || isNavigating}
          aria-busy={isLocating || isNavigating}
          onClick={() => handleSearchSubmit()}
        >
          <SearchIcon className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Dropdown for What Section - Enhanced with Suggestions */}
      {activeSection === "what" && (
        <section
          id={`${searchId}-what`}
          aria-labelledby={`${searchId}-what-trigger`}
          className={cn(
            "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
            "bg-popover text-popover-foreground rounded-2xl border border-border p-6",
            "shadow-lg",
            "max-h-[min(500px,55dvh)] overflow-y-auto overscroll-contain scrollbar-thin"
          )}
        >
          {/* Search Input */}
          <div className="relative mb-4">
            <Input
              ref={inputRef}
              placeholder={t("search_by_title_or_description")}
              aria-label={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "h-12 ps-12 pe-4 rounded-xl border border-border",
                "text-base",
                "hover:border-foreground",
                "focus:border-primary focus:ring-1 focus:ring-primary"
              )}
              autoFocus
            />
            <div className="absolute inset-s-4 top-1/2 -translate-y-1/2">
              <SearchIcon className="text-lg text-muted-foreground" />
            </div>
            {isLoading && (
              <div className="absolute inset-e-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              </div>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  {searchTerm
                    ? "Suggestions"
                    : recentSearches.length > 0
                      ? "Recent searches"
                      : "Popular searches"}
                </p>
                {!searchTerm && recentSearches.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearHistory}
                    className="h-11 text-sm"
                  >
                    {t("clear_all")}
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-3 rounded-lg cursor-pointer",
                      "transition-all duration-200 ease-in-out",
                      selectedIndex === index
                        ? "bg-primary/10 border border-primary"
                        : "bg-transparent hover:bg-muted"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto min-h-12 min-w-0 flex-1 justify-start whitespace-normal text-start"
                      onClick={() => handleSearchSubmit(suggestion.text)}
                    >
                      {suggestion.type === "history" ? (
                        <svg
                          aria-hidden="true"
                          className="w-5 h-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : suggestion.type === "popular" ? (
                        <svg
                          aria-hidden="true"
                          className="w-5 h-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      ) : (
                        <SearchIcon className="text-lg text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{suggestion.text}</p>
                        {suggestion.category && suggestion.category !== selectedCategory && (
                          <p className="text-xs text-muted-foreground">in {suggestion.category}</p>
                        )}
                      </div>
                    </Button>
                    {suggestion.type === "history" && (
                      <Button
                        type="button"
                        size="icon-lg"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(suggestion.text);
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Remove from history"
                      >
                        <svg
                          aria-hidden="true"
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searchTerm && !isLoading && suggestions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">
                No results found for &quot;{searchTerm}&quot;
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or browse all categories
              </p>
            </div>
          )}
        </section>
      )}

      {/* Dropdown for Distance Section */}
      {activeSection === "distance" && canSearchNearby && (
        <section
          id={`${searchId}-distance`}
          aria-labelledby={`${searchId}-distance-trigger`}
          className={cn(
            "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
            "bg-popover text-popover-foreground rounded-2xl border border-border p-6",
            "shadow-lg max-h-[55dvh] overflow-y-auto overscroll-contain scrollbar-thin"
          )}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">{t("distance_filter")}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRadius(null);
                setLocationError(false);
                setActiveSection(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("clear")}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{t("select_distance_range")}</p>
          {locationError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-border bg-muted p-3 text-sm text-foreground"
            >
              {t("search_filters.location_error")}
            </p>
          )}

          {/* Distance Options */}
          <div className="flex flex-col gap-2">
            {[
              ...[1, 2, 5, 10].map((km) => ({
                value: km * 1000,
                label: t("search_filters.within_km", { distance: km }),
              })),
              { value: null, label: t("search_filters.any_distance") },
            ].map((option) => (
              <Button
                type="button"
                variant="ghost"
                aria-pressed={selectedRadius === option.value}
                key={option.value ?? "any"}
                className={cn(
                  "h-12 justify-start px-4 rounded-lg border",
                  "transition-all duration-200 ease-in-out",
                  selectedRadius === option.value
                    ? "bg-primary/10 border-primary"
                    : "bg-transparent border-transparent",
                  "hover:bg-muted hover:border-border"
                )}
                onClick={() => {
                  setSelectedRadius(option.value);
                  setLocationError(false);
                  setActiveSection(null);
                }}
              >
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Dropdown for Category Section */}
      {activeSection === "category" && (
        <section
          id={`${searchId}-category`}
          aria-labelledby={`${searchId}-category-trigger`}
          className={cn(
            "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
            "bg-popover text-popover-foreground rounded-2xl border border-border p-4",
            "shadow-lg",
            "max-h-[min(400px,55dvh)] overflow-y-auto overscroll-contain scrollbar-thin"
          )}
        >
          <p className="text-sm font-semibold text-foreground mb-3">{t("select_a_category")}</p>
          <div className="flex flex-col gap-2">
            {[
              {
                id: "all",
                label: t.has("forum_all_categories") ? t("forum_all_categories") : "All categories",
                icon: SearchIcon,
              },
              ...CATEGORIES.filter(
                (category) => category.id !== "forum" && category.id !== "foodlytics"
              ).map((category) => ({
                id: category.id,
                label: t(category.labelKey),
                icon: category.icon,
              })),
            ].map((category) => (
              <Button
                type="button"
                variant="ghost"
                aria-pressed={selectedCategory === category.id}
                key={category.id}
                className={cn(
                  "h-12 justify-start gap-3 px-3 rounded-lg",
                  "transition-all duration-200 ease-in-out",
                  selectedCategory === category.id ? "bg-primary/10" : "bg-transparent",
                  "hover:bg-muted"
                )}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setActiveSection(null);
                }}
              >
                <category.icon className="size-5" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{category.label}</span>
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SearchBar;
