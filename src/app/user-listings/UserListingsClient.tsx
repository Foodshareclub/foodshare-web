"use client";

import { refreshUserListingsCache } from "@/app/actions/products";
import { ProductCard } from "@/components/productCard/ProductCard";
import { Badge } from "@/components/ui/badge";
import { type Locale, getLocaleDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { InitialProductStateType } from "@/types/product.types";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserListingsEmptyState } from "./components/UserListingsEmptyState";
import { MobileListingsHeader, UserListingsSidebar } from "./components/UserListingsSidebar";
import { UserListingsToolbar } from "./components/UserListingsToolbar";
import { type FilterStatus, type SortOption, USER_LISTINGS_COPY } from "./components/types";

interface UserListingsClientProps {
  listings: InitialProductStateType[];
}

export function UserListingsClient({ listings }: UserListingsClientProps) {
  const offscreen = getLocaleDirection(useLocale() as Locale) === "rtl" ? "translate-x-8" : "-translate-x-8";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUserListingsCache();
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const postTypes = [...new Set(listings.map((l) => l.post_type))];

  const filteredListings = listings
    .filter((listing) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !listing.post_name.toLowerCase().includes(query) &&
          !listing.post_description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (filterStatus === "active" && listing.is_active !== true) return false;
      if (filterStatus === "inactive" && listing.is_active !== false) return false;
      if (filterType !== "all" && listing.post_type !== filterType) return false;
      return true;
    })
    .toSorted((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.post_name.localeCompare(b.post_name);
        case "views":
          return (b.post_views || 0) - (a.post_views || 0);
        default:
          return 0;
      }
    });

  const activeCount = listings.filter((l) => l.is_active === true).length;
  const inactiveCount = listings.filter((l) => l.is_active === false).length;
  const hasActiveFilters = Boolean(searchQuery) || filterStatus !== "all" || filterType !== "all";
  const activeFilterCount = [searchQuery, filterStatus !== "all", filterType !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterType("all");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="flex flex-col lg:flex-row pt-20">
        <UserListingsSidebar
          totalCount={listings.length}
          activeCount={activeCount}
          inactiveCount={inactiveCount}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          offscreenClass={isLoaded ? "translate-x-0 opacity-100" : `${offscreen} opacity-0`}
        />

        <section
          aria-label={USER_LISTINGS_COPY.title}
          className={cn(
            "flex-1 p-4 lg:p-6 lg:ps-2",
            "transform transition-all duration-500 delay-100",
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <MobileListingsHeader totalCount={listings.length} activeCount={activeCount} inactiveCount={inactiveCount} />

          <UserListingsToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            postTypes={postTypes}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            mobileFiltersOpen={mobileFiltersOpen}
            onMobileFiltersOpenChange={setMobileFiltersOpen}
            filteredCount={filteredListings.length}
            totalCount={listings.length}
          />

          {listings.length === 0 ? (
            <UserListingsEmptyState mode="no-listings" />
          ) : filteredListings.length === 0 ? (
            <UserListingsEmptyState mode="no-matches" onClearFilters={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-[auto_1fr] gap-x-6 gap-y-10">
              {filteredListings.map((listing, idx) => (
                <div
                  key={listing.id}
                  style={idx >= 8 ? { contentVisibility: "auto", containIntrinsicSize: "auto 380px" } : undefined}
                  className={cn(
                    "transform transition-all duration-300 hover:scale-[1.02] hover:z-10",
                    !listing.is_active && "opacity-50 grayscale-[30%] hover:opacity-70 hover:grayscale-0",
                  )}
                >
                  <div className="relative group">
                    {!listing.is_active && (
                      <div className="absolute top-3 start-3 z-10">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs">
                          {USER_LISTINGS_COPY.inactiveBadge}
                        </Badge>
                      </div>
                    )}
                    <ProductCard product={listing} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
