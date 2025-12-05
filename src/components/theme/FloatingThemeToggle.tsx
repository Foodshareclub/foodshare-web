'use client';

/**
 * FloatingThemeToggle Component
 * A floating action button for quick theme switching with keyboard shortcuts
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/theme/themeConfig";

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8m-4-4v4" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" />
  </svg>
);

interface FloatingThemeToggleProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  showKeyboardHint?: boolean;
  className?: string;
}

function FloatingThemeToggle({
  position = "bottom-right",
  showKeyboardHint = true,
  className,
}: FloatingThemeToggleProps) {
    const { theme, resolvedTheme, setTheme, toggleTheme, hapticEnabled } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showShortcutHint, setShowShortcutHint] = useState(false);

    // Position classes
    const positionClasses = {
      "bottom-right": "bottom-6 right-6",
      "bottom-left": "bottom-6 left-6",
      "top-right": "top-6 right-6",
      "top-left": "top-6 left-6",
    };

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Alt/Option + T to toggle theme
        if (e.altKey && e.key.toLowerCase() === "t") {
          e.preventDefault();
          if (hapticEnabled) triggerHaptic("medium");
          toggleTheme();
          setShowShortcutHint(true);
          setTimeout(() => setShowShortcutHint(false), 1500);
        }
        // Alt/Option + D for dark mode
        if (e.altKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          if (hapticEnabled) triggerHaptic("light");
          setTheme("dark");
        }
        // Alt/Option + L for light mode
        if (e.altKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          if (hapticEnabled) triggerHaptic("light");
          setTheme("light");
        }
        // Alt/Option + S for system mode
        if (e.altKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (hapticEnabled) triggerHaptic("light");
          setTheme("system");
        }
        // Escape to close expanded menu
        if (e.key === "Escape" && isExpanded) {
          setIsExpanded(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleTheme, setTheme, isExpanded, hapticEnabled]);

    // Close menu when clicking outside
    useEffect(() => {
      if (!isExpanded) return;

      const handleClickOutside = () => setIsExpanded(false);
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }, [isExpanded]);

    const handleToggleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hapticEnabled) triggerHaptic("light");
        setIsExpanded(!isExpanded);
      },
      [isExpanded, hapticEnabled]
    );

    const handleThemeSelect = useCallback(
      (newTheme: "light" | "dark" | "system") => {
        if (hapticEnabled) triggerHaptic("medium");
        setTheme(newTheme);
        setIsExpanded(false);
      },
      [setTheme, hapticEnabled]
    );

    const handleQuickToggle = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hapticEnabled) triggerHaptic("medium");
        toggleTheme();
      },
      [toggleTheme, hapticEnabled]
    );

    return (
      <div className={cn("fixed z-50", positionClasses[position], className)}>
        {/* Keyboard shortcut hint */}
        <AnimatePresence>
          {showShortcutHint && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute bottom-full mb-2 right-0 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg whitespace-nowrap"
            >
              Theme toggled! (Alt+T)
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded menu */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bottom-full mb-3 right-0 bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 space-y-1 min-w-[160px]">
                {/* Light mode */}
                <button
                  onClick={() => handleThemeSelect("light")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    theme === "light" ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <SunIcon />
                  <span className="flex-1 text-left text-sm font-medium">Light</span>
                  {showKeyboardHint && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Alt+L
                    </span>
                  )}
                </button>

                {/* Dark mode */}
                <button
                  onClick={() => handleThemeSelect("dark")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    theme === "dark" ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <MoonIcon />
                  <span className="flex-1 text-left text-sm font-medium">Dark</span>
                  {showKeyboardHint && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Alt+D
                    </span>
                  )}
                </button>

                {/* System mode */}
                <button
                  onClick={() => handleThemeSelect("system")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    theme === "system" ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <SystemIcon />
                  <span className="flex-1 text-left text-sm font-medium">System</span>
                  {showKeyboardHint && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Alt+S
                    </span>
                  )}
                </button>
              </div>

              {/* Keyboard hint footer */}
              {showKeyboardHint && (
                <div className="px-3 py-2 bg-muted/50 border-t border-border">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <KeyboardIcon />
                    <span>Alt+T to quick toggle</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main floating button */}
        <motion.div className="relative" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Button */}
          <button
            onClick={handleToggleClick}
            onDoubleClick={handleQuickToggle}
            className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-primary/80",
              "text-primary-foreground shadow-lg",
              "hover:shadow-xl transition-shadow",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            title="Theme settings (Alt+T to toggle)"
            aria-label="Theme settings"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={resolvedTheme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {resolvedTheme === "dark" ? <MoonIcon /> : <SunIcon />}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* Pulse indicator when expanded */}
          {isExpanded && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    );
}

export { FloatingThemeToggle };
