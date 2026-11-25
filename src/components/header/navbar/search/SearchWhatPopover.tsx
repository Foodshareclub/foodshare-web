"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Clock, Search, TrendingUp, X } from "lucide-react";
import type React from "react";
import { SEARCH_POPOVER_COPY } from "./constants";

export interface SearchSuggestionItem {
  id: string;
  text: string;
  type: "history" | "popular" | "suggestion";
  category?: string;
}

interface SearchWhatPopoverProps {
  searchId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  placeholder: string;
  searchLabel: string;
  clearAllLabel: string;
  isLoading: boolean;
  suggestions: SearchSuggestionItem[];
  recentSearchesCount: number;
  selectedCategory: string;
  selectedIndex: number;
  onChangeSearchTerm: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onHoverSuggestion: (index: number) => void;
  onSelectSuggestion: (text: string) => void;
  onRemoveFromHistory: (text: string) => void;
  onClearHistory: () => void;
}

/**
 * Search keyword popover with IME-safe keyboard handling and real-time suggestions.
 */
export function SearchWhatPopover({
  searchId,
  inputRef,
  searchTerm,
  placeholder,
  searchLabel,
  clearAllLabel,
  isLoading,
  suggestions,
  recentSearchesCount,
  selectedCategory,
  selectedIndex,
  onChangeSearchTerm,
  onKeyDown,
  onHoverSuggestion,
  onSelectSuggestion,
  onRemoveFromHistory,
  onClearHistory,
}: SearchWhatPopoverProps) {
  const sectionTitle = searchTerm
    ? SEARCH_POPOVER_COPY.suggestionsHeading
    : recentSearchesCount > 0
      ? SEARCH_POPOVER_COPY.recentSearchesHeading
      : SEARCH_POPOVER_COPY.popularSearchesHeading;

  return (
    <section
      id={`${searchId}-what`}
      aria-labelledby={`${searchId}-what-trigger`}
      className={cn(
        "absolute top-[calc(100%+8px)] inset-x-0 z-20",
        "bg-background/95 text-foreground rounded-3xl border border-border/80 p-5 sm:p-6",
        "shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200",
        "max-h-[min(500px,55dvh)] overflow-y-auto overscroll-contain scrollbar-thin",
      )}
    >
      <div className="relative mb-4">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          aria-label={searchLabel}
          value={searchTerm}
          onChange={(e) => onChangeSearchTerm(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-12 ps-12 pe-4 rounded-xl border border-border",
            "text-base",
            "hover:border-foreground",
            "focus:border-primary focus:ring-1 focus:ring-primary",
          )}
          autoFocus
        />
        <div className="absolute inset-s-4 top-1/2 -translate-y-1/2">
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        {isLoading && (
          <div className="absolute inset-e-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground">{sectionTitle}</p>
            {!searchTerm && recentSearchesCount > 0 && (
              <Button type="button" variant="ghost" onClick={onClearHistory} className="h-11 text-sm">
                {clearAllLabel}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-2 py-1.5 rounded-xl cursor-pointer",
                  "transition-all duration-200 ease-in-out",
                  selectedIndex === index ? "bg-muted shadow-xs" : "bg-transparent hover:bg-muted/50",
                )}
                onMouseEnter={() => onHoverSuggestion(index)}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-12 min-w-0 flex-1 justify-start whitespace-normal text-start gap-3 p-2 rounded-xl"
                  onClick={() => onSelectSuggestion(suggestion.text)}
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted/60 shrink-0">
                    {suggestion.type === "history" ? (
                      <Clock aria-hidden="true" className="size-4 text-muted-foreground" />
                    ) : suggestion.type === "popular" ? (
                      <TrendingUp aria-hidden="true" className="size-4 text-muted-foreground" />
                    ) : (
                      <Search aria-hidden="true" className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{suggestion.text}</p>
                    {suggestion.category && suggestion.category !== selectedCategory && (
                      <p className="text-xs text-muted-foreground">
                        {`${SEARCH_POPOVER_COPY.inCategoryPrefix}${suggestion.category}`}
                      </p>
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
                      onRemoveFromHistory(suggestion.text);
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={SEARCH_POPOVER_COPY.removeFromHistoryLabel}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {searchTerm && !isLoading && suggestions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-2">
            {`${SEARCH_POPOVER_COPY.noResultsPrefix}"${searchTerm}"`}
          </p>
          <p className="text-xs text-muted-foreground">{SEARCH_POPOVER_COPY.noResultsHint}</p>
        </div>
      )}
    </section>
  );
}
