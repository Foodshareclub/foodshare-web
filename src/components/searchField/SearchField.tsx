'use client';

import type { ChangeEvent } from "react";
import { useState } from "react";
import { SearchIcon } from "@/utils/icons";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

// React Compiler handles memoization automatically
export function SearchField() {
  const router = useRouter();

  const [searchValue, setSearchValue] = useState("");
  const [productType, setProductType] = useState("all");
  const [showSearchParams, setShowSearchParams] = useState(false);

  // React Compiler optimizes these handlers automatically
  const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.currentTarget.value);
  };

  const onFindResultsHandler = () => {
    if (searchValue) {
      router.push(`/${productType}?key_word=${searchValue}`);
      setProductType("all");
      setSearchValue("");
      setShowSearchParams(false);
    }
  };

  const onFocusHandler = () => setShowSearchParams(true);

  const onProductTypeChange = (value: string) => setProductType(value);

  return (
    <div className="glass-input self-center w-[30%] rounded-xl">
      <div className="flex flex-col items-center">
        <div className="relative w-full flex items-center">
          <div className="absolute left-3 pointer-events-none">
            <SearchIcon
              className={`cursor-pointer ${showSearchParams ? "text-primary" : "text-muted-foreground"}`}
              onClick={showSearchParams ? onFindResultsHandler : undefined}
            />
          </div>
          <Input
            value={searchValue}
            onChange={onSearchHandler}
            onFocus={onFocusHandler}
            variant="glass"
            className="bg-transparent border-none pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={"What are we in search of today?"}
          />
        </div>
        {showSearchParams && (
          <div className="glass p-2 mt-2 w-full rounded-xl">
            <div className="flex flex-wrap gap-2">
              {["all", "food", "things", "borrow", "wanted", "foodbanks"].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value={type}
                    checked={productType === type}
                    onChange={(e) => onProductTypeChange(e.target.value)}
                    className="w-4 h-4 text-rausch-500 focus:ring-rausch-500"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
