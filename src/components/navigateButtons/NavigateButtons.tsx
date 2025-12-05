'use client';

import type { RefObject } from "react";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWindowEvent } from "@/hooks/useEvent";
import { Button } from "@/components/ui/button";

type NavigateButtonsType = {
  messagesAnchorRef?: RefObject<HTMLDivElement>;
  title: string;
  navigateTo?: string;
};

export default function NavigateButtons({ navigateTo, messagesAnchorRef, title }: NavigateButtonsType) {
    const [scrollTop, setScrollTop] = useState(0);
    useWindowEvent("scroll", () => {
      setScrollTop(window.scrollY);
    });
    const pathname = usePathname();
    const pathType = location.pathname.split("/")[1];
    // Default to "food" when on home page or no type specified
    const type = pathType || "food";
    const navigationValue = `/map/${type}`;

    const router = useRouter();
    const navigateHandler = () => {
      if (navigateTo) {
        router.push(`/${navigateTo}`);
      } else {
        router.push(navigationValue);
      }
    };
    const goToStart = () => {
      if (messagesAnchorRef?.current) {
        messagesAnchorRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    // Always show map button on listing pages (home + category pages)
    // Hide on other routes like settings, about, etc.
    const nonListingRoutes = [
      "settings",
      "about-us",
      "contact-us",
      "donation",
      "feedback",
      "admin",
      "auth",
      "chat",
      "user-listings",
      "volunteer",
      "map",
      "s",
    ];
    const showMapButton = !nonListingRoutes.includes(pathType);
    // Show button when navigateTo is explicitly provided (e.g., "Show posts" on map)
    // OR when on listing pages (e.g., "Show map" on food/goods pages)
    const showButton = navigateTo || showMapButton;

    return (
      <>
        {/* Airbnb-style Fixed Map/Navigate Button - Always Sticky Higher from Bottom */}
        {showButton && (
          <div className="fixed bottom-20 md:bottom-[100px] left-1/2 -translate-x-1/2 z-[1000]">
            <button
              onClick={navigateHandler}
              className="bg-foreground text-background rounded-3xl px-5 md:px-6 py-3 h-12 font-semibold text-sm flex items-center gap-2 shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-white/10 transition-all duration-200 hover:bg-foreground/90 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:scale-95"
            >
              <span className="text-base">🗺️</span>
              {title}
            </button>
          </div>
        )}

        {/* Scroll to Top Button - Bottom Right */}
        {scrollTop > 400 && (
          <div
            className="fixed bottom-5 md:bottom-10 right-5 md:right-10 z-[1000] animate-[fadeIn_0.3s_ease-out]"
            style={{
              willChange: "transform, opacity",
            }}
          >
            <Button
              variant="glass-prominent"
              onClick={goToStart}
              className="rounded-full w-14 h-14 text-white/90 text-xs font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
              style={{
                willChange: "transform",
                transform: "translate3d(0, 0, 0)",
              }}
            >
              ↑
            </Button>
          </div>
        )}
      </>
    );
}
