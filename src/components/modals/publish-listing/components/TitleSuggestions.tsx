"use client";

import React, { useState, useMemo } from "react";
import { Wand2 } from "lucide-react";
import { titleSuggestions } from "../constants";

interface TitleSuggestionsProps {
  category: string;
  onSelect: (title: string) => void;
  currentTitle: string;
}

export const TitleSuggestions: React.FC<TitleSuggestionsProps> = ({
  category,
  onSelect,
  currentTitle,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(
    () =>
      category && category in titleSuggestions
        ? titleSuggestions[category as keyof typeof titleSuggestions]
        : [],
    [category]
  );

  const filteredSuggestions = useMemo(() => {
    if (!currentTitle) return suggestions.slice(0, 4);
    return suggestions
      .filter(
        (s) =>
          s.toLowerCase().includes(currentTitle.toLowerCase()) ||
          currentTitle.toLowerCase().includes(s.toLowerCase().split(" ")[0])
      )
      .slice(0, 4);
  }, [suggestions, currentTitle]);

  if (suggestions.length === 0 || filteredSuggestions.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowSuggestions(!showSuggestions)}
        className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
        title="Title suggestions"
      >
        <Wand2 className="h-4 w-4" />
      </button>

      {showSuggestions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 p-2 rounded-lg bg-popover border shadow-lg animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-muted-foreground mb-2 px-1">Click to use suggestion</p>
            <div className="space-y-1">
              {filteredSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelect(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
