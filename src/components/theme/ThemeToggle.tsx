'use client';

/**
 * ThemeToggle Component
 * Beautiful animated dark/light mode switcher with dropdown
 * Uses Framer Motion for smooth transitions
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Theme } from "@/store/zustand/useUIStore";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showDropdown?: boolean;
}

const sizeClasses = {
  sm: "w-14 h-7",
  md: "w-16 h-8",
  lg: "w-20 h-10",
};

const knobSizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-5 h-5",
};

const knobTranslate = {
  sm: 28,
  md: 32,
  lg: 40,
};

// Sun icon with animated rays
const SunIcon: React.FC<{ className?: string; animate?: boolean }> = ({
  className,
  animate = false,
}) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    animate={animate ? { rotate: 360 } : {}}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </motion.svg>
);

// Moon icon with craters
const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

// Monitor icon for system theme
const MonitorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

// Animated stars for dark mode with shooting stars
const Stars: React.FC = () => (
  <>
    {/* Twinkling stars */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          width: i % 2 === 0 ? 2 : 1.5,
          height: i % 2 === 0 ? 2 : 1.5,
          top: `${15 + ((i * 17) % 60)}%`,
          left: `${10 + ((i * 23) % 50)}%`,
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 0.6, 1, 0],
          scale: [0, 1, 0.8, 1, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: i * 0.4,
          ease: "easeInOut",
        }}
      />
    ))}
    {/* Shooting star */}
    <motion.div
      className="absolute w-0.5 h-0.5 bg-white rounded-full"
      style={{ top: "20%", left: "60%" }}
      animate={{
        x: [-5, 15],
        y: [-5, 15],
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 4,
        ease: "easeOut",
      }}
    >
      <motion.div
        className="absolute w-4 h-0.5 bg-gradient-to-r from-white to-transparent rounded-full"
        style={{ right: "100%", top: "0" }}
      />
    </motion.div>
  </>
);

// Animated clouds for light mode with birds
const Clouds: React.FC = () => (
  <>
    {/* Fluffy cloud 1 */}
    <motion.div
      className="absolute"
      style={{ top: "22%", left: "12%" }}
      animate={{ x: [0, 4, 0], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative">
        <div className="absolute rounded-full bg-white/60" style={{ width: 8, height: 5 }} />
        <div
          className="absolute rounded-full bg-white/50"
          style={{ width: 6, height: 4, top: -2, left: 4 }}
        />
        <div
          className="absolute rounded-full bg-white/55"
          style={{ width: 5, height: 3, top: 1, left: 7 }}
        />
      </div>
    </motion.div>
    {/* Fluffy cloud 2 */}
    <motion.div
      className="absolute"
      style={{ top: "55%", left: "22%" }}
      animate={{ x: [0, -3, 0], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      <div className="relative">
        <div className="absolute rounded-full bg-white/50" style={{ width: 7, height: 4 }} />
        <div
          className="absolute rounded-full bg-white/45"
          style={{ width: 5, height: 3, top: -1, left: 3 }}
        />
      </div>
    </motion.div>
    {/* Flying bird silhouette */}
    <motion.div
      className="absolute"
      style={{ top: "35%", left: "45%" }}
      animate={{
        x: [-2, 10],
        y: [0, -3, 0],
        opacity: [0, 0.6, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatDelay: 5,
        ease: "easeOut",
      }}
    >
      <svg width="6" height="3" viewBox="0 0 6 3" className="text-slate-600/40">
        <path
          d="M0 1.5 Q1.5 0 3 1.5 Q4.5 0 6 1.5"
          stroke="currentColor"
          fill="none"
          strokeWidth="0.5"
        />
      </svg>
    </motion.div>
    {/* Sun lens flare */}
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 6,
        height: 6,
        top: "40%",
        left: "8%",
        background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
      }}
      animate={{
        scale: [0.8, 1.2, 0.8],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </>
);

// Dropdown menu item
const ThemeMenuItem: React.FC<{
  theme: Theme;
  currentTheme: Theme;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ theme, currentTheme, label, icon, onClick }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      currentTheme === theme
        ? "bg-primary/10 text-primary dark:bg-primary/20"
        : "hover:bg-muted text-foreground/80 hover:text-foreground"
    )}
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
    <span>{label}</span>
    {currentTheme === theme && (
      <motion.div
        layoutId="theme-check"
        className="ml-auto"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <svg
          className="w-4 h-4 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    )}
  </motion.button>
);

// Main Toggle Component
function ThemeToggle({
  className,
  size = "md",
  showDropdown = true,
}: ThemeToggleProps) {
    const { theme, isDark, toggleTheme, setTheme, isSystem } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-theme-toggle]")) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
      }
    }, [isOpen]);

    // Keyboard shortcut: Ctrl/Cmd + Shift + L
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          toggleTheme();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [toggleTheme]);

    const handleToggleClick = useCallback(() => {
      if (showDropdown) {
        setIsOpen((prev) => !prev);
      } else {
        toggleTheme();
      }
    }, [showDropdown, toggleTheme]);

    const handleThemeSelect = useCallback(
      (newTheme: Theme) => {
        setTheme(newTheme);
        setIsOpen(false);
      },
      [setTheme]
    );

    return (
      <div className="relative" data-theme-toggle>
        {/* Main Toggle Button */}
        <motion.button
          onClick={handleToggleClick}
          className={cn(
            "relative rounded-full p-0.5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg",
            sizeClasses[size],
            className
          )}
          style={{
            background: isDark
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
              : "linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #818cf8 100%)",
          }}
          whileHover={{
            scale: 1.05,
            boxShadow: isDark
              ? "0 0 20px rgba(99, 102, 241, 0.3)"
              : "0 0 20px rgba(251, 191, 36, 0.4)",
          }}
          whileTap={{ scale: 0.95 }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-expanded={isOpen}
          role="button"
          title="Toggle theme (Ctrl+Shift+L)"
        >
          {/* Background Effects */}
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div
                key="night"
                className="absolute inset-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Stars />
                {/* Moon glow */}
                <motion.div
                  className="absolute rounded-full bg-blue-400/20 blur-md"
                  style={{ width: 20, height: 20, top: "20%", right: "10%" }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="day"
                className="absolute inset-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Clouds />
                {/* Sun rays */}
                <motion.div
                  className="absolute rounded-full bg-yellow-300/30 blur-sm"
                  style={{ width: 16, height: 16, top: "30%", left: "5%" }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Knob */}
          <motion.div
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full shadow-xl",
              knobSizeClasses[size]
            )}
            style={{
              background: isDark
                ? "linear-gradient(145deg, #475569, #334155)"
                : "linear-gradient(145deg, #fef3c7, #fbbf24)",
              boxShadow: isDark
                ? "inset 2px 2px 4px rgba(255,255,255,0.1), inset -2px -2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)"
                : "inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(251,191,36,0.5)",
            }}
            animate={{
              x: isDark ? knobTranslate[size] : 0,
              rotate: isDark ? 0 : 360,
            }}
            transition={{
              x: { type: "spring", stiffness: 400, damping: 25 },
              rotate: { duration: 0.5, ease: "easeOut" },
            }}
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="moon-icon"
                  initial={{ opacity: 0, rotate: -90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <MoonIcon className={cn(iconSizeClasses[size], "text-blue-200")} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun-icon"
                  initial={{ opacity: 0, rotate: 90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -90, scale: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <SunIcon className={cn(iconSizeClasses[size], "text-amber-600")} animate />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* System indicator dot */}
          {isSystem && (
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              title="Following system preference"
            />
          )}
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && showDropdown && (
            <motion.div
              className="absolute right-0 mt-2 w-48 py-2 bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 z-50"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="px-3 pb-2 mb-2 border-b border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Theme
                </p>
              </div>
              <div className="px-1 space-y-0.5">
                <ThemeMenuItem
                  theme="light"
                  currentTheme={theme}
                  label="Light"
                  icon={<SunIcon className="w-4 h-4 text-amber-500" />}
                  onClick={() => handleThemeSelect("light")}
                />
                <ThemeMenuItem
                  theme="dark"
                  currentTheme={theme}
                  label="Dark"
                  icon={<MoonIcon className="w-4 h-4 text-blue-400" />}
                  onClick={() => handleThemeSelect("dark")}
                />
                <ThemeMenuItem
                  theme="system"
                  currentTheme={theme}
                  label="System"
                  icon={<MonitorIcon className="w-4 h-4 text-muted-foreground" />}
                  onClick={() => handleThemeSelect("system")}
                />
              </div>
              <div className="px-3 pt-2 mt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
                  {" + "}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift</kbd>
                  {" + "}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">L</kbd>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
}

// Simple inline toggle for mobile drawer
function ThemeToggleInline({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <SunIcon className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <MoonIcon className="w-4 h-4" /> },
    { value: "system", label: "Auto", icon: <MonitorIcon className="w-4 h-4" /> },
  ];

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-xl", className)}>
      {themes.map(({ value, label, icon }) => (
        <motion.button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            theme === value
              ? "bg-background text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export { ThemeToggle, ThemeToggleInline, SunIcon, MoonIcon, MonitorIcon };
