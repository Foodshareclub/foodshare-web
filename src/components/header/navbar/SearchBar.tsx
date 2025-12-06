'use client';

/**
 * Enhanced SearchBar Component with Real-time Suggestions
 *
 * Features:
 * - Real-time search suggestions
 * - Search history with localStorage
 * - Popular searches by category
 * - Debounced input (300ms)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - GPU-accelerated animations
 * - Accessibility compliant (WCAG AA)
 */

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SearchIcon } from "@/utils/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gpu120Animation, gpu120Fade } from "@/utils/gpuStyles";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";

interface SearchBarProps {
  isCompact?: boolean;
  onSearchClick: () => void;
  defaultCategory?: string;
}

function SearchBar({ isCompact = false, onSearchClick, defaultCategory = "all" }: SearchBarProps) {
    const t = useTranslations();
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Selected values for display
    const [selectedDistance, setSelectedDistance] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

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
    const handleSearchSubmit = (term?: string) => {
      const searchValue = term || searchTerm;
      if (searchValue && searchValue.trim()) {
        handleSearch(searchValue);
        router.push(`/s/${selectedCategory}?key_word=${encodeURIComponent(searchValue.trim())}`);
        setActiveSection(null);
        setSearchTerm("");
        setSelectedIndex(-1);
      }
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

    // Compact search button (when scrolled)
    if (isCompact) {
      return (
        <div
          className={cn(
            "flex items-center bg-background border rounded-[40px] shadow-sm",
            "transition-all duration-200 ease-in-out cursor-pointer",
            isHovered ? "border-foreground shadow-md" : "border-border"
          )}
          onClick={onSearchClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="button"
          aria-label="Open search"
          tabIndex={0}
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          {/* What Section */}
          <div className="flex flex-col px-4 py-2 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-foreground">
              What
            </span>
            <span className="text-xs text-muted-foreground truncate">{searchTerm || "Search items"}</span>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-border" />

          {/* Distance Section */}
          <div className="flex flex-col px-4 py-2 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-foreground">
              Distance
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {selectedDistance || "Add distance"}
            </span>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-border" />

          {/* Category Section */}
          <div className="flex flex-col px-4 py-2 flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-foreground">
              Category
            </span>
            <span className="text-xs text-muted-foreground truncate">{selectedCategory}</span>
          </div>

          {/* Search Button */}
          <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-8 h-8 m-2 flex-shrink-0">
            <SearchIcon className="text-sm" />
          </div>
        </div>
      );
    }

    // Expanded search bar (shown at top of page)
    return (
      <div className="relative w-full" ref={containerRef}>
        <div
          className={cn(
            "flex items-center w-full bg-background border rounded-[40px]",
            "transition-all duration-200 ease-in-out",
            isHovered || activeSection ? "border-foreground" : "border-border",
            isHovered || activeSection
              ? "shadow-[0_2px_4px_hsl(var(--foreground)/0.18)]"
              : "shadow-[0_1px_2px_hsl(var(--foreground)/0.08)]"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* What Section */}
          <div
            className={cn(
              "flex flex-col flex-1 px-6 py-3 cursor-pointer rounded-l-[40px]",
              "transition-colors duration-100 ease-in-out",
              activeSection === "what" ? "bg-muted" : "bg-transparent",
              "hover:bg-muted"
            )}
            style={{ transform: "translate3d(0, 0, 0)", willChange: "background-color" }}
            onClick={() => {
              setActiveSection(activeSection === "what" ? null : "what");
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <span className="text-xs font-semibold text-foreground mb-0.5">
              What
            </span>
            <span className="text-sm text-muted-foreground truncate">{searchTerm || "Search items"}</span>
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-border self-center" />

          {/* Distance Section */}
          <div
            className={cn(
              "flex flex-col flex-1 px-6 py-3 cursor-pointer",
              "transition-colors duration-100 ease-in-out",
              activeSection === "distance" ? "bg-muted" : "bg-transparent",
              "hover:bg-muted"
            )}
            style={{ transform: "translate3d(0, 0, 0)", willChange: "background-color" }}
            onClick={() => setActiveSection(activeSection === "distance" ? null : "distance")}
          >
            <span className="text-xs font-semibold text-foreground mb-0.5">
              Distance
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {selectedDistance || "Add distance"}
            </span>
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-border self-center" />

          {/* Category Section */}
          <div
            className={cn(
              "flex flex-col flex-1 px-6 py-3 cursor-pointer rounded-r-[40px]",
              "transition-colors duration-100 ease-in-out",
              activeSection === "category" ? "bg-muted" : "bg-transparent",
              "hover:bg-muted"
            )}
            style={{ transform: "translate3d(0, 0, 0)", willChange: "background-color" }}
            onClick={() => setActiveSection(activeSection === "category" ? null : "category")}
          >
            <span className="text-xs font-semibold text-foreground mb-0.5">
              Category
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {selectedCategory === "all" ? "All categories" : selectedCategory}
            </span>
          </div>

          {/* Search Button */}
          <div
            className={cn(
              "flex items-center justify-center bg-primary text-primary-foreground rounded-full",
              "w-12 h-12 flex-shrink-0 mr-2 cursor-pointer",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              "hover:bg-primary/90 hover:scale-105",
              "active:scale-95"
            )}
            style={{ transform: "translate3d(0, 0, 0)", willChange: "transform" }}
            onClick={() => handleSearchSubmit()}
          >
            <SearchIcon className="text-lg" />
          </div>
        </div>

        {/* Dropdown for What Section - Enhanced with Suggestions */}
        {activeSection === "what" && (
          <div
            className={cn(
              "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
              "bg-popover text-popover-foreground rounded-2xl border border-border p-6",
              "shadow-lg",
              "max-h-[500px] overflow-y-auto"
            )}
            style={{ ...gpu120Fade }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="relative mb-4">
              <Input
                ref={inputRef}
                placeholder={"Search for food, items, and more..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "h-12 pl-12 pr-4 rounded-xl border border-border",
                  "text-base",
                  "hover:border-foreground",
                  "focus:border-primary focus:ring-1 focus:ring-primary"
                )}
                autoFocus
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <SearchIcon className="text-lg text-muted-foreground" />
              </div>
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                </div>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {searchTerm ? (
                      "Suggestions"
                    ) : recentSearches.length > 0 ? (
                      "Recent searches"
                    ) : (
                      "Popular searches"
                    )}
                  </p>
                  {!searchTerm && recentSearches.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear all
                    </button>
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
                      onClick={() => handleSearchSubmit(suggestion.text)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {suggestion.type === "history" ? (
                          <svg
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
                      </div>
                      {suggestion.type === "history" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(suggestion.text);
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                          aria-label="Remove from history"
                        >
                          <svg
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
                        </button>
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
          </div>
        )}

        {/* Dropdown for Distance Section */}
        {activeSection === "distance" && (
          <div
            className={cn(
              "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
              "bg-popover text-popover-foreground rounded-2xl border border-border p-6",
              "shadow-lg"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Distance Filter
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDistance("");
                  setActiveSection(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Select distance range
            </p>

            {/* Distance Options */}
            <div className="flex flex-col gap-2">
              {[
                { value: "1 km", label: "Within 1 km" },
                { value: "2 km", label: "Within 2 km" },
                { value: "5 km", label: "Within 5 km" },
                { value: "10 km", label: "Within 10 km" },
                { value: "Any", label: "Any distance" },
              ].map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg cursor-pointer border",
                    "transition-all duration-200 ease-in-out",
                    selectedDistance === option.value
                      ? "bg-primary/10 border-primary"
                      : "bg-transparent border-transparent",
                    "hover:bg-muted hover:border-border"
                  )}
                  onClick={() => {
                    setSelectedDistance(option.value);
                    setActiveSection(null);
                  }}
                >
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dropdown for Category Section */}
        {activeSection === "category" && (
          <div
            className={cn(
              "absolute top-[calc(100%+8px)] left-0 right-0 z-10",
              "bg-popover text-popover-foreground rounded-2xl border border-border p-4",
              "shadow-lg",
              "max-h-[400px] overflow-y-auto"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-foreground mb-3">
              Select a category
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: "all", label: "All Categories", icon: "🔍" },
                { id: "food", label: "Food", icon: "🍎" },
                { id: "things", label: "Things", icon: "🎁" },
                { id: "borrow", label: "Borrow", icon: "🔧" },
                { id: "wanted", label: "Wanted", icon: "📦" },
                { id: "foodbanks", label: "FoodBanks", icon: "🏠" },
                { id: "fridges", label: "Fridges", icon: "❄️" },
                { id: "organisations", label: "Organisations", icon: "🏛️" },
                { id: "volunteers", label: "Volunteers", icon: "🙌🏻" },
                { id: "challenges", label: "Challenges", icon: "🏆" },
                { id: "zerowaste", label: "Zero Waste", icon: "♻️" },
                { id: "vegan", label: "Vegan", icon: "🌱" },
              ].map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                    "transition-all duration-200 ease-in-out",
                    selectedCategory === category.id ? "bg-primary/10" : "bg-transparent",
                    "hover:bg-muted"
                  )}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setActiveSection(null);
                  }}
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-sm font-medium text-foreground">{category.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
}

export default SearchBar;
