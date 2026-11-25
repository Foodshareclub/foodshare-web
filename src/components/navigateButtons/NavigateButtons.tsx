"use client";

import { Button } from "@/components/ui/button";
import { useWindowEvent } from "@/hooks/useEvent";
import { ArrowUp, List, Map } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { RefObject } from "react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type NavigateButtonsType = {
  messagesAnchorRef?: RefObject<HTMLDivElement>;
  title?: string;
  navigateTo?: string;
  children?: React.ReactNode;
};

export default function NavigateButtons({ navigateTo, messagesAnchorRef, title, children }: NavigateButtonsType) {
  const [scrollTop, setScrollTop] = useState(0);
  const [footerOffset, setFooterOffset] = useState(0);
  const buttonWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let footer = document.querySelector("footer");
    let observer: IntersectionObserver | null = null;

    const handlePosition = () => {
      if (!footer) {
        footer = document.querySelector("footer") || document.getElementById("site-footer");
        if (footer && !observer) {
          attachObserver(footer);
        }
      }
      if (!footer) return;

      const rect = footer.getBoundingClientRect();
      if (rect.height === 0 || window.getComputedStyle(footer).display === "none") {
        if (buttonWrapperRef.current) {
          buttonWrapperRef.current.style.transform = "translate3d(0, 0, 0)";
        }
        setFooterOffset(0);
        return;
      }
      const windowHeight = window.innerHeight;
      const isMobile = window.innerWidth < 768;
      const baseBottom = isMobile ? 80 : 32;
      const margin = 24;
      const visibleFooterHeight = windowHeight - rect.top;

      let nextOffset = 0;
      if (visibleFooterHeight > 0) {
        const targetBottom = visibleFooterHeight + margin;
        const rawOffset = Math.max(0, targetBottom - baseBottom);
        const maxOffset = Math.max(0, windowHeight - baseBottom - 48 - 90);
        nextOffset = Math.min(Math.round(rawOffset), maxOffset);
      }

      if (buttonWrapperRef.current) {
        buttonWrapperRef.current.style.transform = `translate3d(0, -${nextOffset}px, 0)`;
      }
      setFooterOffset(nextOffset);
    };

    function attachObserver(target: Element) {
      observer = new IntersectionObserver(
        () => {
          handlePosition();
        },
        {
          threshold: [0, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        },
      );
      observer.observe(target);
    }

    if (footer) {
      attachObserver(footer);
    }

    const onScroll = () => {
      setScrollTop(window.scrollY);
      handlePosition();
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", handlePosition, { passive: true });

    handlePosition();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", handlePosition);
    };
  }, []);

  const pathname = usePathname();
  const segments = pathname ? pathname.split("/").filter(Boolean) : [];
  const isMapRoute = segments[0] === "map";
  const pathType = isMapRoute ? segments[1] || "food" : segments[0] || "food";
  // Default to "food" when on home page or no type specified
  const type = pathType || "food";

  const defaultTitle = isMapRoute ? "Show listings" : "Show map";
  const displayTitle = title || defaultTitle;

  const router = useRouter();
  const navigateHandler = () => {
    if (navigateTo) {
      const target = navigateTo.startsWith("/") ? navigateTo : `/${navigateTo}`;
      router.push(target);
    } else if (isMapRoute) {
      router.push(`/${type}`);
    } else {
      router.push(`/map/${type}`);
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
    "challenge",
    "forum",
  ];
  const showMapButton = !nonListingRoutes.includes(segments[0] || "");
  // Show button when on map routes ("Show listings"), or when on listing pages ("Show map"),
  // or when navigateTo is explicitly provided
  const showButton = Boolean(navigateTo || showMapButton || isMapRoute);

  return (
    <>
      {/* Filter controls slot - rendered at top of page */}
      {children && (
        <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-4">{children}</div>
        </div>
      )}

      {/* Airbnb-style Fixed Map/Navigate Button */}
      {showButton && (
        <div
          ref={buttonWrapperRef}
          className="fixed bottom-20 md:bottom-8 inset-x-0 flex justify-center pointer-events-none z-40"
          style={{
            transform: `translate3d(0, -${footerOffset}px, 0)`,
            willChange: "transform",
          }}
        >
          <button
            type="button"
            aria-label={displayTitle}
            onClick={navigateHandler}
            className="pointer-events-auto bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full px-5 md:px-6 py-2.5 h-11 font-semibold text-sm flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.25)] border border-white/15 dark:border-black/10 transition-all duration-200 hover:bg-black dark:hover:bg-neutral-100 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {displayTitle.toLowerCase().includes("list") || displayTitle.toLowerCase().includes("posts") ? (
              <List className="size-4 shrink-0 text-current" aria-hidden="true" />
            ) : (
              <Map className="size-4 shrink-0 text-current" aria-hidden="true" />
            )}
            <span>{displayTitle}</span>
          </button>
        </div>
      )}

      {/* Scroll to Top Button - Bottom Right */}
      {scrollTop > 400 && (
        <div
          className="fixed bottom-5 md:bottom-10 end-5 md:end-10 z-[1000] animate-[fadeIn_0.3s_ease-out]"
          style={{
            willChange: "transform, opacity",
          }}
        >
          <Button
            variant="glass-prominent"
            onClick={goToStart}
            className="rounded-full size-12 text-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
            style={{
              willChange: "transform",
              transform: "translate3d(0, 0, 0)",
            }}
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </>
  );
}
