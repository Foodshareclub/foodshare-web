'use client';

import type { ChangeEvent } from "react";
import React, { memo, useState } from "react";
import { SearchIcon } from "@/utils/icons";
import { useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import { GlassDialogContent } from "@/components/Glass";
import { Glass } from "@/components/Glass";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SearchModal: React.FC<SearchModalProps> = memo(({ isOpen, onClose }) => {
  const t = useTranslations();
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
      router.push(`/s/${productType}?key_word=${encodeURIComponent(trimmedValue)}`);
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
      <GlassDialogContent maxW={{ base: "100%", md: "600px" }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {"Search FoodShare"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="flex gap-2 items-center">
            <Input
              className="flex-1 rounded-[20px] h-14 text-base"
              value={searchValue}
              onChange={onSearchHandler}
              onKeyPress={handleKeyPress}
              placeholder={"What are we in search of today?"}
              autoFocus
            />
            <Button
              size="lg"
              className="rounded-full bg-red-500 hover:bg-red-600 text-white flex-shrink-0 hover:scale-105 transition-all"
              onClick={onFindResultsHandler}
              aria-label="search listings"
              disabled={!searchValue.trim() || isSearching}
            >
              <SearchIcon />
            </Button>
          </div>

          {/* Category Filter */}
          <Glass variant="subtle" padding="md" borderRadius="12px">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              {[
                { value: "all", label: "All" },
                { value: "food", label: "Food" },
                { value: "things", label: "Things" },
                { value: "borrow", label: "Borrow" },
                { value: "wanted", label: "Wanted" },
                { value: "foodbanks", label: "FoodBanks" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value={option.value}
                    checked={productType === option.value}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </Glass>
        </div>
      </GlassDialogContent>
    </Dialog>
  );
});

SearchModal.displayName = "SearchModal";

export default SearchModal;
