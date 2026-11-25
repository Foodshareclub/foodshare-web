"use client";

/**
 * Enhanced SearchBar Component with Real-time Suggestions
 *
 * Modular shell coordinating SearchBarTrigger and keyword/distance/category popovers.
 */

import { CATEGORIES } from "@/constants/categories";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import {
  buildListingSearchUrl,
  parseSearchLocation,
  parseSearchRadius,
  supportsNearbySearch,
} from "@/lib/listing-search";
import { useUIStore } from "@/store/zustand/useUIStore";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { SearchBarTrigger } from "./search/SearchBarTrigger";
import { SearchCategoryPopover } from "./search/SearchCategoryPopover";
import { SearchDistancePopover } from "./search/SearchDistancePopover";
import { SearchWhatPopover } from "./search/SearchWhatPopover";

interface SearchBarProps {
  isCompact?: boolean;
  onSearchClick: () => void;
  defaultCategory?: string;
}

const DEFAULT_CATEGORY_FALLBACK = "All categories";

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
    [],
  );

  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const [locationError, setLocationError] = useState(false);
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const selectedDistance = selectedRadius === null ? t("search_filters.any_distance") : `${selectedRadius / 1000} km`;
  const canSearchNearby = supportsNearbySearch(selectedCategory);
  const categoryDefinition = CATEGORIES.find((category) => category.id === selectedCategory);
  const allCategoriesLabel = t.has("forum_all_categories") ? t("forum_all_categories") : DEFAULT_CATEGORY_FALLBACK;
  const categoryLabel = categoryDefinition ? t(categoryDefinition.labelKey) : allCategoriesLabel;

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
    searchParams.get("type") === "all" ? "all" : defaultCategory === "business" ? "organisation" : defaultCategory;
  const appliedRadius = searchParams.get("radius");
  const appliedDistance = searchParams.get("distance");

  const [prevApplied, setPrevApplied] = useState<{
    term: string;
    category: string;
    radius: string | null;
    distance: string | null;
  } | null>(null);
  if (
    prevApplied === null ||
    appliedTerm !== prevApplied.term ||
    appliedCategory !== prevApplied.category ||
    appliedRadius !== prevApplied.radius ||
    appliedDistance !== prevApplied.distance
  ) {
    setPrevApplied({
      term: appliedTerm,
      category: appliedCategory,
      radius: appliedRadius,
      distance: appliedDistance,
    });
    setIsLocating(false);
    setSearchTerm(appliedTerm);
    setSelectedCategory(appliedCategory);
    setSelectedRadius(appliedDistance === "any" || !appliedRadius ? null : parseSearchRadius(appliedRadius));
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidates pending geolocation when URL params change
  useEffect(() => {
    locationAttempt.current += 1;
  }, [appliedTerm, appliedCategory, appliedRadius, appliedDistance]);

  const [selectedIndex, setSelectedIndex] = useState(-1);

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

  const handleSearchSubmit = async (term?: string) => {
    if (isLocating || isNavigating) return;
    const attempt = ++locationAttempt.current;
    const searchValue = (term ?? searchTerm).trim();
    setLocationError(false);
    let location = parseSearchLocation(searchParams);
    if (!location && userLocation) location = { lat: userLocation.latitude, lng: userLocation.longitude };

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
        containerRef.current?.querySelector<HTMLButtonElement>('[data-search-field="distance"]')?.focus();
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
        }),
      );
    });
    setActiveSection(null);
    setSearchTerm(searchValue);
    setSelectedIndex(-1);
    containerRef.current?.querySelector<HTMLButtonElement>('[data-search-field="what"]')?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeSection || activeSection !== "what") return;
    // Guard against interrupting CJK/IME composition on Enter
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

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

  const distanceOptions = [
    ...[1, 2, 5, 10].map((km) => ({
      value: km * 1000,
      label: t("search_filters.within_km", { distance: km }),
    })),
    { value: null, label: t("search_filters.any_distance") },
  ];

  const categoryOptions = [
    {
      id: "all",
      label: allCategoriesLabel,
      icon: Search,
    },
    ...CATEGORIES.filter((category) => category.id !== "forum" && (category.id as string) !== "foodwastelytics").map(
      (category) => ({
        id: category.id,
        label: t(category.labelKey),
        icon: category.icon,
      }),
    ),
  ];

  return (
    <div
      className="relative w-full"
      ref={containerRef}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || !activeSection) return;
        event.preventDefault();
        event.stopPropagation();
        containerRef.current?.querySelector<HTMLButtonElement>(`[data-search-field="${activeSection}"]`)?.focus();
        setActiveSection(null);
        setSelectedIndex(-1);
      }}
    >
      <SearchBarTrigger
        isCompact={isCompact}
        searchId={searchId}
        activeSection={activeSection}
        searchTerm={searchTerm}
        selectedDistance={selectedDistance}
        categoryLabel={categoryLabel}
        canSearchNearby={canSearchNearby}
        isHovered={isHovered}
        isBusy={isLocating || isNavigating}
        onHoverChange={setIsHovered}
        onCompactClick={() => {
          setActiveSection("what");
          onSearchClick();
        }}
        onToggleSection={(section) => setActiveSection(activeSection === section ? null : section)}
        onSubmit={() => handleSearchSubmit()}
        labels={{
          searchHeader: t("msgsearchheader"),
          whatPlaceholder: t("what_are_you_looking_for"),
          what: t("what"),
          distance: t("distance"),
          selectDistanceRange: t("select_distance_range"),
          category: t("category"),
          search: t("search"),
        }}
      />

      {!isCompact && activeSection === "what" && (
        <SearchWhatPopover
          searchId={searchId}
          inputRef={inputRef}
          searchTerm={searchTerm}
          placeholder={t("search_by_title_or_description")}
          searchLabel={t("search")}
          clearAllLabel={t("clear_all")}
          isLoading={isLoading}
          suggestions={suggestions}
          recentSearchesCount={recentSearches.length}
          selectedCategory={selectedCategory}
          selectedIndex={selectedIndex}
          onChangeSearchTerm={setSearchTerm}
          onKeyDown={handleKeyDown}
          onHoverSuggestion={setSelectedIndex}
          onSelectSuggestion={(text) => handleSearchSubmit(text)}
          onRemoveFromHistory={removeFromHistory}
          onClearHistory={clearHistory}
        />
      )}

      {!isCompact && activeSection === "distance" && canSearchNearby && (
        <SearchDistancePopover
          searchId={searchId}
          selectedRadius={selectedRadius}
          locationError={locationError}
          options={distanceOptions}
          labels={{
            distanceFilter: t("distance_filter"),
            clear: t("clear"),
            selectDistanceRange: t("select_distance_range"),
            locationErrorText: t("search_filters.location_error"),
          }}
          onClear={() => {
            setSelectedRadius(null);
            setLocationError(false);
            setActiveSection(null);
          }}
          onSelectRadius={(value) => {
            setSelectedRadius(value);
            setLocationError(false);
            setActiveSection(null);
          }}
        />
      )}

      {!isCompact && activeSection === "category" && (
        <SearchCategoryPopover
          searchId={searchId}
          selectedCategory={selectedCategory}
          options={categoryOptions}
          labels={{
            selectCategory: t("select_a_category"),
            category: t("category"),
          }}
          onSelectCategory={(categoryId) => {
            setSelectedCategory(categoryId);
            setActiveSection(null);
          }}
        />
      )}
    </div>
  );
}

export default SearchBar;
