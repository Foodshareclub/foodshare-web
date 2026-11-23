"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import type React from "react";
import { useState } from "react";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SEARCH_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "things", label: "Things" },
  { value: "borrow", label: "Borrow" },
  { value: "wanted", label: "Wanted" },
  { value: "foodbanks", label: "FoodBanks" },
  { value: "fridges", label: "Fridges" },
  { value: "volunteers", label: "Volunteers" },
] as const;

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [productType, setProductType] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.currentTarget.value);
  };

  const onFindResultsHandler = () => {
    const trimmedValue = searchValue.trim();
    if (trimmedValue) {
      setIsSearching(true);
      // Navigate to search results page with proper URL encoding
      router.push(`/${productType}?key_word=${encodeURIComponent(trimmedValue)}`);
      onClose();
      // Reset after navigation completes
      setTimeout(() => {
        setProductType("all");
        setSearchValue("");
        setIsSearching(false);
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching) {
      onFindResultsHandler();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            {"Search FoodShare"}
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {"Discover fresh food, essential goods, or volunteers in your community"}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <div className="absolute inset-s-4 pointer-events-none text-muted-foreground flex items-center justify-center">
              <Search className="size-5" aria-hidden="true" />
            </div>
            <Input
              className="w-full h-14 ps-12 pe-16 rounded-2xl border-border/80 bg-muted/30 hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm sm:text-base font-normal placeholder:text-muted-foreground transition-all"
              value={searchValue}
              onChange={onSearchHandler}
              onKeyPress={handleKeyPress}
              placeholder={"What are you looking for?"}
              autoFocus
            />
            <Button
              size="icon"
              className="absolute inset-e-2 size-10 rounded-xl bg-brand hover:bg-brand-hover text-white shadow-xs hover:shadow-sm active:scale-95 transition-all disabled:opacity-50"
              onClick={onFindResultsHandler}
              aria-label="search listings"
              disabled={!searchValue.trim() || isSearching}
            >
              <Search className="size-4.5" aria-hidden="true" />
            </Button>
          </div>

          {/* Category Exploration Chips */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {"Filter by Category"}
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {SEARCH_CATEGORIES.map((option) => {
                const isSelected = productType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setProductType(option.value)}
                    className={cn(
                      "h-9 px-3.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-95",
                      isSelected
                        ? "border-brand bg-brand/10 text-brand shadow-2xs"
                        : "border-border/80 bg-background/80 hover:bg-muted/60 hover:border-foreground/30 text-foreground",
                    )}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
