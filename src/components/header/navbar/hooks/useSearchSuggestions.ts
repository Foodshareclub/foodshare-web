/**
 * useSearchSuggestions Hook
 * Provides real-time search suggestions with debouncing and caching
 *
 * Features:
 * - Debounced search (300ms)
 * - Local storage for search history
 * - Popular searches
 * - Recent searches
 * - Smart suggestions based on category
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "history" | "popular" | "suggestion";
  category?: string;
  count?: number;
}

interface UseSearchSuggestionsOptions {
  category?: string;
  minLength?: number;
  maxSuggestions?: number;
  debounceMs?: number;
}

export interface UseSearchSuggestionsReturn {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  recentSearches: string[];
  handleSearch: (term: string) => void;
  removeFromHistory: (term: string) => void;
  clearHistory: () => void;
  error: string | null;
}

const SEARCH_HISTORY_KEY = "foodshare_search_history";
const MAX_HISTORY_ITEMS = 10;
const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_MAX_SUGGESTIONS = 8;
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Get search history from localStorage
 */
function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

/**
 * Save search to history
 */
function saveToHistory(searchTerm: string): void {
  try {
    const history = getSearchHistory();
    const updated = [
      searchTerm,
      ...history.filter((item) => item.toLowerCase() !== searchTerm.toLowerCase()),
    ].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Failed to save search history:", error);
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.warn("Failed to clear search history:", error);
  }
}

/**
 * Popular search terms by category
 */
const POPULAR_SEARCHES: Record<string, string[]> = {
  food: [
    "Fresh vegetables",
    "Baked goods",
    "Fruits",
    "Dairy products",
    "Canned food",
    "Bread",
    "Pasta",
    "Rice",
  ],
  things: [
    "Household items",
    "Furniture",
    "Electronics",
    "Clothing",
    "Books",
    "Toys",
    "Kitchen items",
    "Tools",
  ],
  borrow: ["Tools", "Equipment", "Books", "Games", "Sports gear", "Kitchen appliances"],
  wanted: ["Food", "Furniture", "Electronics", "Clothing", "Books", "Toys"],
  all: [
    "Fresh vegetables",
    "Baked goods",
    "Household items",
    "Books",
    "Furniture",
    "Tools",
    "Clothing",
    "Electronics",
  ],
};

export function useSearchSuggestions(
  options: UseSearchSuggestionsOptions = {}
): UseSearchSuggestionsReturn {
  const {
    category = "all",
    minLength = DEFAULT_MIN_LENGTH,
    maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getSearchHistory());
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Fetch suggestions from database
   */
  const fetchSuggestions = useCallback(
    async (term: string): Promise<SearchSuggestion[]> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        // Build query
        let query = supabase
          .from("posts")
          .select("post_name, post_type")
          .eq("is_active", true)
          .textSearch("post_name", term, { type: "websearch" })
          .limit(maxSuggestions);

        // Filter by category if not "all"
        if (category && category !== "all") {
          query = query.eq("post_type", category);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform to suggestions
        const uniqueNames = new Set<string>();
        const suggestions: SearchSuggestion[] = [];

        data?.forEach((item) => {
          const name = item.post_name.toLowerCase();
          if (!uniqueNames.has(name)) {
            uniqueNames.add(name);
            suggestions.push({
              id: `suggestion-${name}`,
              text: item.post_name,
              type: "suggestion",
              category: item.post_type,
            });
          }
        });

        return suggestions;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return [];
        }
        console.error("Failed to fetch suggestions:", error);
        setError("Failed to load suggestions");
        return [];
      }
    },
    [category, maxSuggestions]
  );

  /**
   * Get popular searches for current category
   */
  const getPopularSearches = useCallback((): SearchSuggestion[] => {
    const popular = POPULAR_SEARCHES[category] || POPULAR_SEARCHES.all;
    return popular.slice(0, maxSuggestions).map((text, index) => ({
      id: `popular-${index}`,
      text,
      type: "popular" as const,
      category,
    }));
  }, [category, maxSuggestions]);

  /**
   * Get recent searches
   */
  const getRecentSearchSuggestions = useCallback((): SearchSuggestion[] => {
    return recentSearches.slice(0, maxSuggestions).map((text, index) => ({
      id: `history-${index}`,
      text,
      type: "history" as const,
    }));
  }, [recentSearches, maxSuggestions]);

  /**
   * Update suggestions based on search term
   */
  useEffect(() => {
    const updateSuggestions = async () => {
      // Clear previous errors
      setError(null);

      // Empty search - show recent and popular
      if (!debouncedSearchTerm || debouncedSearchTerm.length < minLength) {
        const recent = getRecentSearchSuggestions();
        const popular = getPopularSearches();

        // Combine recent and popular (recent first)
        const combined = [...recent];
        popular.forEach((pop) => {
          if (
            !combined.some((item) => item.text.toLowerCase() === pop.text.toLowerCase()) &&
            combined.length < maxSuggestions
          ) {
            combined.push(pop);
          }
        });

        setSuggestions(combined);
        setIsLoading(false);
        return;
      }

      // Fetch suggestions from database
      setIsLoading(true);
      const dbSuggestions = await fetchSuggestions(debouncedSearchTerm);

      // If no results, show popular searches
      if (dbSuggestions.length === 0) {
        setSuggestions(getPopularSearches());
      } else {
        setSuggestions(dbSuggestions);
      }

      setIsLoading(false);
    };

    updateSuggestions();
  }, [
    debouncedSearchTerm,
    minLength,
    fetchSuggestions,
    getPopularSearches,
    getRecentSearchSuggestions,
    maxSuggestions,
  ]);

  /**
   * Handle search submission
   */
  const handleSearch = useCallback((term: string) => {
    if (term && term.trim()) {
      saveToHistory(term.trim());
      setRecentSearches(getSearchHistory());
    }
  }, []);

  /**
   * Clear a specific history item
   */
  const removeFromHistory = useCallback((term: string) => {
    try {
      const history = getSearchHistory();
      const updated = history.filter((item) => item !== term);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.warn("Failed to remove from history:", error);
    }
  }, []);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setRecentSearches([]);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    suggestions,
    isLoading,
    recentSearches,
    handleSearch,
    removeFromHistory,
    clearHistory,
    error: null,
  };
}
