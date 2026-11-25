"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { USER_LISTINGS_COPY } from "./types";

interface UserListingsEmptyStateProps {
  mode: "no-listings" | "no-matches";
  onClearFilters?: () => void;
}

/**
 * Empty or no-filter-matches card for UserListings.
 */
export function UserListingsEmptyState({ mode, onClearFilters }: UserListingsEmptyStateProps) {
  if (mode === "no-listings") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 sm:p-12 text-center max-w-md mx-4 shadow-lg">
          <div className="relative">
            <div className="text-6xl sm:text-7xl mb-6">{USER_LISTINGS_COPY.emptyNoListingsEmoji}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              {USER_LISTINGS_COPY.emptyNoListingsTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed">
              {USER_LISTINGS_COPY.emptyNoListingsBody}
            </p>
            <Link href="/food/new">
              <Button
                size="lg"
                className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all duration-300 gap-2"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                {USER_LISTINGS_COPY.emptyNoListingsCta}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 sm:p-12 text-center max-w-md mx-4 shadow-lg">
        <div className="relative">
          <div className="text-6xl sm:text-7xl mb-6">{USER_LISTINGS_COPY.emptyNoMatchesEmoji}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
            {USER_LISTINGS_COPY.emptyNoMatchesTitle}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed">
            {USER_LISTINGS_COPY.emptyNoMatchesBody}
          </p>
          <Button variant="outline" size="lg" onClick={onClearFilters} className="h-12 px-6 sm:px-8 rounded-xl">
            {USER_LISTINGS_COPY.clearAllFilters}
          </Button>
        </div>
      </div>
    </div>
  );
}
