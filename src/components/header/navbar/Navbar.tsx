'use client';

import React, { memo, useCallback, useMemo } from "react";
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

// 120fps optimization: Pre-calculate GPU-accelerated styles
const GPU_LAYER_STYLE = {
  transform: "translateZ(0)",
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  willChange: "transform, opacity",
};

const NAVBAR_TRANSITION = "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Navbar Component - Airbnb Pattern Implementation
 *
 * DESIGN PHILOSOPHY (Based on Airbnb Research):
 * ================================================
 * 1. SEARCH-FIRST: Search is the hero element, not navigation
 * 2. VISUAL HIERARCHY: Logo → Search → Actions (top), Categories (below)
 * 3. PROGRESSIVE DISCLOSURE: Start simple, reveal complexity on demand
 * 4. STICKY CATEGORIES: Always accessible for quick filtering
 * 5. SMART SCROLL: Hide top bar on scroll down, show on scroll up
 *
 * LAYOUT STRUCTURE:
 * ================
 * Top Bar (hides on scroll)
 * [Logo]           [Search Bar]           [Actions]
 * Category Bar (sticky)
 * [Food] [Things] [Borrow] ... [Filters]
 *
 * Features:
 * - Search-first design with prominent search bar
 * - Sticky category navigation (always visible)
 * - Smart scroll behavior (hide top bar, keep categories)
 * - Responsive design (mobile-first)
 * - GPU-accelerated animations
 * - Accessibility compliant (WCAG AA)
 */
const Navbar: React.FC<NavbarProps> = memo(
  ({
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
  }) => {
    // Get logout function from useAuth hook
    const { logout } = useAuth();
    // Advanced scroll behavior
    // - At Top: Full expanded search bar
    // - Scrolling Down: Search bar becomes compact
    // - Navbar always visible (never hides)
    const { isCompact, scrollY, isAtTop } = useAdvancedScroll({
      compactThreshold: 100, // Compact mode after 100px scroll
      hideThreshold: 150, // Not used (navbar never hides)
      showOnScrollUp: false, // Not needed
      hideOnScrollDown: false, // Navbar always visible
    });

    const router = useRouter();

    // Navigation handlers
    const handleLogoClick = useCallback(() => {
      onProductTypeChange("food");
      router.push(PATH.mainFood);
    }, [router, onProductTypeChange]);

    const handleCategoryChange = useCallback(
      (categoryId: string) => {
        const routeName = categoryId.toLowerCase();
        // Update state
        onRouteChange(routeName);
        onProductTypeChange(categoryId);
        // Navigate to category route - use /map/ prefix in map mode
        const path = mapMode ? `/map/${routeName}` : `/${routeName}`;
        router.push(path);
      },
      [router, onRouteChange, onProductTypeChange, mapMode]
    );

    // Handle search click - scroll to top to show expanded search
    const handleSearchClick = useCallback(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // Navigation callbacks for profile menu
    const handleNavigateToMyLists = useCallback(() => {
      router.push(PATH.myListingsPage);
    }, [router]);

    const handleNavigateToAccountSettings = useCallback(() => {
      router.push(PATH.settingsPage);
    }, [router]);

    const handleNavigateToMyMessages = useCallback(() => {
      router.push("/chat");
    }, [router]);

    const handleNavigateToAboutUs = useCallback(() => {
      router.push(PATH.aboutUsPage);
    }, [router]);

    const handleNavigateToHelp = useCallback(() => {
      router.push('/help');
    }, [router]);

    const handleNavigateToLogout = useCallback(async () => {
      await logout();
    }, [logout]);

    const handleNavigateToDashboard = useCallback(() => {
      router.push('/admin');
    }, [router]);

    // Get active category from productType
    const activeCategory = productType.toLowerCase() || "food";

    // 120fps: Memoize categories to prevent re-renders
    // NOTE: Category IDs must match database post_type values (singular forms)
    const categories = useMemo(
      () => [
        { id: "food", label: "Food", icon: "🍎" },
        { id: "thing", label: "Things", icon: "🎁" },
        { id: "borrow", label: "Borrow", icon: "🔧" },
        { id: "wanted", label: "Wanted", icon: "📦" },
        { id: "foodbank", label: "FoodBanks", icon: "🏠" },
        { id: "fridge", label: "Fridges", icon: "❄️" },
        { id: "business", label: "Business", icon: "🏛️" },
        { id: "volunteer", label: "Volunteer", icon: "🙌🏻" },
        { id: "challenge", label: "Challenges", icon: "🏆" },
        { id: "zerowaste", label: "Zero Waste", icon: "♻️" },
        { id: "vegan", label: "Vegan", icon: "🌱" },
        { id: "community", label: "Forum", icon: "💬" },
      ],
      []
    );

    // 120fps: Memoize box shadow to prevent recalculation
    // Uses CSS variables for dark mode compatibility
    const navbarShadow = useMemo(
      () =>
        scrollY > 10
          ? "0 1px 2px hsl(var(--foreground) / 0.08), 0 4px 12px hsl(var(--foreground) / 0.05)"
          : "0 1px 2px hsl(var(--foreground) / 0.08)",
      [scrollY]
    );

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
              isCompact ? "py-1" : "py-1.5"
            )}
          >
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <NavbarLogo onNavigate={handleLogoClick} isCompact={isCompact} />
            </div>

            {/* Center: Category Navigation (horizontal scrollable) */}
            <div className="flex-1 flex justify-center overflow-x-auto scrollbar-hide">
              <CategoryNavigation
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
              />
            </div>

            {/* Right: Actions (ThemeToggle + BecomeSharer + Menu) */}
            <div className="flex-shrink-0">
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
              isCompact ? "pb-1" : "pb-1.5"
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
            height: isCompact ? "105px" : "140px",
            transition: "height 0.3s ease-in-out",
          }}
        />
      </>
    );
  }
);

Navbar.displayName = "Navbar";

export default Navbar;
