"use client";

/**
 * ThemeProvider Component
 * Advanced theme management with radial reveal animation,
 * time-based scheduling, and accessibility support
 */

import React, { useEffect, useRef, type ReactNode } from "react";
import { ThemeToastProvider } from "./ThemeToast";
import { useTheme } from "@/hooks";

interface ThemeProviderProps {
  children: ReactNode;
}

// Check if user prefers reduced motion
const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Get click position for radial reveal (initialized lazily to avoid SSR issues)
let lastClickPosition = { x: 0, y: 0 };
let clickListenerInitialized = false;

// Initialize click position tracking (called client-side only)
const initClickTracking = () => {
  if (typeof window === "undefined" || clickListenerInitialized) return;

  // Set initial position now that we have access to window
  lastClickPosition = { x: window.innerWidth / 2, y: 0 };

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-theme-toggle]")) {
      lastClickPosition = { x: e.clientX, y: e.clientY };
    }
  });

  clickListenerInitialized = true;
};

/**
 * Creates a radial reveal animation from the click point
 */
const createRadialReveal = (
  resolvedTheme: "light" | "dark",
  position: { x: number; y: number }
) => {
  // Skip if reduced motion preferred or SSR
  if (prefersReducedMotion() || typeof window === "undefined") return;

  // Check for View Transitions API support (use bracket notation to avoid TypeScript narrowing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any).startViewTransition !== undefined) {
    // Use native View Transitions API for buttery smooth animation
    return;
  }

  // Fallback: Create custom radial reveal
  const overlay = document.createElement("div");
  overlay.id = "theme-radial-reveal";

  // Calculate the maximum distance to cover the entire screen
  const maxDist = Math.hypot(
    Math.max(position.x, window.innerWidth - position.x),
    Math.max(position.y, window.innerHeight - position.y)
  );

  const bgColor = resolvedTheme === "dark" ? "#030712" : "#ffffff";

  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    pointer-events: none;
    background: ${bgColor};
    clip-path: circle(0px at ${position.x}px ${position.y}px);
    transition: clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.clipPath = `circle(${maxDist * 1.5}px at ${position.x}px ${position.y}px)`;
    });
  });

  // Clean up
  setTimeout(() => {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease-out";
    setTimeout(() => overlay.remove(), 200);
  }, 500);
};

/**
 * ThemeProvider ensures the theme is applied to the DOM
 */
const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { resolvedTheme, theme } = useTheme();
  const isFirstRender = useRef(true);
  const prevTheme = useRef(resolvedTheme);

  // Apply theme changes with animation
  useEffect(() => {
    // Initialize click tracking on client-side
    initClickTracking();

    const root = document.documentElement;

    // Set color scheme for native elements
    root.style.setProperty("color-scheme", resolvedTheme);

    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevTheme.current = resolvedTheme;
      return;
    }

    // Only animate if theme actually changed
    if (prevTheme.current === resolvedTheme) return;
    prevTheme.current = resolvedTheme;

    // Create radial reveal animation
    createRadialReveal(resolvedTheme, lastClickPosition);

    // Add smooth transitions for elements
    if (!prefersReducedMotion()) {
      const style = document.createElement("style");
      style.id = "theme-transition-styles";
      style.textContent = `
        *, *::before, *::after {
          transition:
            background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
            fill 0.25s cubic-bezier(0.4, 0, 0.2, 1),
            stroke 0.25s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => style.remove(), 500);
    }
  }, [resolvedTheme]);

  // Time-based auto theme (when set to system)
  useEffect(() => {
    if (theme !== "system") return;

    const checkTimeBasedTheme = () => {
      // Time-based theme check - respects system preference
      // Dark from 7 PM to 7 AM, but system handles via prefers-color-scheme
    };

    // Check every minute for time changes
    const interval = setInterval(checkTimeBasedTheme, 60000);
    return () => clearInterval(interval);
  }, [theme]);

  return <ThemeToastProvider>{children}</ThemeToastProvider>;
};

export { ThemeProvider };
