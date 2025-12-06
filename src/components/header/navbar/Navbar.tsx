'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdvancedScroll } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import NavbarLogo from "./NavbarLogo";
import SearchBar from "./SearchBar";
import NavbarActions from "./NavbarActions";
import { CategoryNavigation } from "./organisms";

import { PATH } from "@/utils";
import type { NavbarProps } from "./types";

// Category definitions (module-level constant)
const CATEGORIES = [
  { id: "food", label: "Food", icon: "🍎" },
  { id: "thing", label: "Things", icon: "🎁" },
  { id: "borrow", label: "Borrow", icon: "🔧" },
  { id: "wanted", label: "Wanted", icon: "📦" },
  { id: "foodbank", label: "FoodBanks", icon: "🏠" },
  { id: "fridge", label: "Fridges", icon: "❄️" },
  { id: "business", label: "Business", icon: "🏛️" },
  { id: "volunteer", label: "Volunteer", icon: "🙌🏻" },
  { id: "zerowaste", label: "Zero Waste", icon: "♻️" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "challenge", label: "Challenges", icon: "🏆" },
  { id: "community", label: "Forum", icon: "💬" },
] as const;

/**
 * Navbar Component - Airbnb Pattern Implementation
 * Note: React Compiler handles memoization automatically
 */
function Navbar({
  userId,
  isAuth,
  isAdmin = false,
  productType,
  onRouteChange,
  onProductTypeChange,
  imgUrl = "",
  firstName = "",
  secondName = "",
  email = "",
  signalOfNewMessage = [],
  mapMode = false,
}: NavbarProps) {
  const { logout } = useAuth();
  const { isCompact, scrollY } = useAdvancedScroll({
    compactThreshold: 100,
    hideThreshold: 150,
    showOnScrollUp: false,
    hideOnScrollDown: false,
  });

  const router = useRouter();
  const activeCategory = productType.toLowerCase() || "food";

  // Navigation handlers - React Compiler optimizes these
  const handleLogoClick = () => {
    onProductTypeChange("food");
    router.push(PATH.mainFood);
  };

  const handleCategoryChange = (categoryId: string) => {
    const routeName = categoryId.toLowerCase();
    onRouteChange(routeName);
    onProductTypeChange(categoryId);
    // Forum is a special case - it's not a product type filter
    if (routeName === 'community') {
      router.push('/forum');
      return;
    }
    const path = mapMode ? `/map/${routeName}` : `/${routeName}`;
    router.push(path);
  };

  const handleSearchClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToMyLists = () => router.push(PATH.myListingsPage);
  const handleNavigateToAccountSettings = () => router.push(PATH.settingsPage);
  const handleNavigateToMyMessages = () => router.push("/chat");
  const handleNavigateToAboutUs = () => router.push(PATH.aboutUsPage);
  const handleNavigateToHelp = () => router.push('/help');
  const handleNavigateToLogout = async () => await logout();
  const handleNavigateToDashboard = () => router.push('/admin');

  const navbarShadow = scrollY > 10
    ? "0 1px 2px hsl(var(--foreground) / 0.08), 0 4px 12px hsl(var(--foreground) / 0.05)"
    : "0 1px 2px hsl(var(--foreground) / 0.08)";

    return (
      <>
        {/* SINGLE MERGED NAVBAR - Always Visible */}
        <div
          className={cn(
            "bg-background w-full fixed top-0 z-[100]",
            "border-b border-border"
          )}
          style={{
            boxShadow: navbarShadow,
            backfaceVisibility: "hidden" as const,
            perspective: 1000,
          }}
        >
          {/* Row 1: Logo + Category Tabs + Actions */}
          <div
            className={cn(
              "flex items-center justify-between gap-4 px-4 md:px-7 xl:px-20",
              "transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isCompact ? "pt-3 pb-1" : "pt-4 pb-1.5"
            )}
          >
            {/* Left: Logo - fixed width for true centering */}
            <div className="flex-shrink-0 w-[140px]">
              <NavbarLogo onNavigate={handleLogoClick} isCompact={isCompact} />
            </div>

            {/* Center: Category Navigation - truly centered */}
            <div className="flex-1 flex justify-center">
              <CategoryNavigation
                categories={CATEGORIES}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
              />
            </div>

            {/* Right: Actions - fixed width to match left for true centering */}
            <div className="flex-shrink-0 w-[140px] flex justify-end">
              <NavbarActions
                isAuth={isAuth}
                isAdmin={isAdmin}
                userId={userId}
                imgUrl={imgUrl}
                firstName={firstName}
                secondName={secondName}
                email={email}
                signalOfNewMessage={signalOfNewMessage}
                onNavigateToMyLists={handleNavigateToMyLists}
                onNavigateToLogout={handleNavigateToLogout}
                onNavigateToAccSettings={handleNavigateToAccountSettings}
                onNavigateToHelp={handleNavigateToHelp}
                onNavigateToAboutUs={handleNavigateToAboutUs}
                onNavigateToMyMessages={handleNavigateToMyMessages}
                onNavigateToDashboard={handleNavigateToDashboard}
              />
            </div>
          </div>

          {/* Row 2: Search Bar (centered, responsive to scroll) */}
          <div
            className={cn(
              "flex justify-center items-center px-4 md:px-7 xl:px-20",
              "transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isCompact ? "py-1.5" : "py-3"
            )}
          >
            <div className={cn(isCompact ? "w-auto" : "w-full max-w-[850px]")}>
              <SearchBar
                isCompact={isCompact}
                onSearchClick={handleSearchClick}
                defaultCategory={activeCategory}
              />
            </div>
          </div>
        </div>

        {/* Spacer - adjusted for new single navbar height */}
        <div
          style={{
            height: isCompact ? "120px" : "170px",
            transition: "height 0.3s ease-in-out",
          }}
        />
      </>
    );
}

export default Navbar;
