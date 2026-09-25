"use client";

import { useAdvancedScroll } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LISTING_CONTAINER } from "@/components/productCard/listing-layout";
import { GradientBackground } from "@/components/gpu/GradientBackground";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import NavbarActions from "./NavbarActions";
import NavbarLogo from "./NavbarLogo";
import SearchBar from "./SearchBar";
import { CategoryNavigation } from "./organisms";
import type { NavbarProps } from "./types";

import { CATEGORIES } from "@/constants/categories";
import { PATH } from "@/utils";

/**
 * Navbar Component - Airbnb Pattern Implementation
 * Note: React Compiler handles memoization automatically
 */
function Navbar({
  userId,
  isAuth,
  isAdmin = false,
  productType,
  onProductTypeChange,
  imgUrl = "",
  firstName = "",
  secondName = "",
  email = "",
  signalOfNewMessage = [],
  mapMode = false,
  initialUnreadCount = 0,
}: NavbarProps) {
  const _t = useTranslations();
  const { logout } = useAuth();
  const { scrollY } = useAdvancedScroll({
    compactThreshold: 100,
    hideThreshold: 150,
    showOnScrollUp: false,
    hideOnScrollDown: false,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const routeCategory = productType.toLowerCase() || "food";
  const activeCategory =
    searchParams.get("type") === "all"
      ? "all"
      : routeCategory === "business"
        ? "organisation"
        : routeCategory;

  // Get category translations
  const tCategories = useTranslations("categories");

  // Translate category labels — React Compiler handles memoization
  const translatedCategories = CATEGORIES.map((cat) => ({
    id: cat.id,
    // Extract key from "categories.food" -> "food"
    label: tCategories(cat.labelKey.replace("categories.", "")),
    icon: cat.icon,
  }));

  // Navigation handlers - React Compiler optimizes these
  const handleLogoClick = () => {
    onProductTypeChange("food");
    router.push(PATH.mainFood);
  };

  const handleCategoryChange = (categoryId: string) => {
    const routeName = categoryId.toLowerCase();
    onProductTypeChange(categoryId);

    // Forum, Challenge and Foodlytics have their own routes without map views
    if (routeName === "forum" || routeName === "challenge" || routeName === "foodlytics") {
      const keyword = routeName === "challenge" ? searchParams.get("key_word") : null;
      router.push(
        `/${routeName}${keyword ? `?${new URLSearchParams({ key_word: keyword })}` : ""}`
      );
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    const query = params.toString();
    const targetRoute = `/${routeName}${query ? `?${query}` : ""}`;

    if (mapMode) {
      router.push(`/map/${routeName}`);
    } else {
      router.push(targetRoute);
    }
  };

  const handleSearchClick = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const handleNavigateToMyLists = () => router.push(PATH.myListingsPage);
  const handleNavigateToAccountSettings = () => router.push(PATH.settingsPage);
  const handleNavigateToMyMessages = () => router.push("/chat");
  const handleNavigateToAboutUs = () => router.push(PATH.aboutUsPage);
  const handleNavigateToHelp = () => router.push("/help");
  const handleNavigateToLogout = async () => await logout();
  const handleNavigateToDashboard = () => router.push("/admin");

  const navbarShadow =
    scrollY > 10
      ? "0 1px 2px hsl(var(--foreground) / 0.08), 0 4px 12px hsl(var(--foreground) / 0.05)"
      : "0 1px 2px hsl(var(--foreground) / 0.08)";

  return (
    <>
      {/* SINGLE MERGED NAVBAR - Always Visible */}
      <header
        className={cn("navbar sticky top-0 z-[100] w-full bg-background", "border-b border-border")}
        style={{
          boxShadow: navbarShadow,
          backfaceVisibility: "hidden" as const,
          perspective: 1000,
        }}
      >
        {/* Stable primary row; search moves below the actions on smaller screens. */}
        <div
          className={cn(
            LISTING_CONTAINER,
            "relative isolate z-20 grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:py-4"
          )}
        >
          <GradientBackground />
          {/* Keep the logo and actions outside the scrollable category region. */}
          <div className="shrink-0">
            <NavbarLogo onNavigate={handleLogoClick} />
          </div>

          <div className="col-start-2 row-start-1 flex shrink-0 justify-end lg:col-start-3">
            <NavbarActions
              isAuth={isAuth}
              isAdmin={isAdmin}
              userId={userId}
              imgUrl={imgUrl}
              firstName={firstName}
              secondName={secondName}
              email={email}
              signalOfNewMessage={signalOfNewMessage}
              initialUnreadCount={initialUnreadCount}
              onNavigateToMyLists={handleNavigateToMyLists}
              onNavigateToLogout={handleNavigateToLogout}
              onNavigateToAccSettings={handleNavigateToAccountSettings}
              onNavigateToHelp={handleNavigateToHelp}
              onNavigateToAboutUs={handleNavigateToAboutUs}
              onNavigateToMyMessages={handleNavigateToMyMessages}
              onNavigateToDashboard={handleNavigateToDashboard}
            />
          </div>
          {activeCategory !== "foodlytics" && activeCategory !== "forum" && (
            <div className="col-span-2 row-start-2 w-full min-w-0 max-w-[720px] justify-self-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
              <SearchBar
                key={activeCategory}
                onSearchClick={handleSearchClick}
                defaultCategory={activeCategory}
              />
            </div>
          )}
        </div>
        <div className="border-t border-border/60">
          <div className={LISTING_CONTAINER}>
            <CategoryNavigation
              categories={translatedCategories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              className="gap-3 py-2 sm:gap-5 lg:justify-between"
            />
          </div>
        </div>
      </header>
    </>
  );
}

export default Navbar;
