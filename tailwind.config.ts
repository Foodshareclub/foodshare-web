/**
 * Tailwind CSS Configuration
 *
 * This configuration follows the shadcn/ui pattern with CSS variables for theming.
 * Colors are defined as HSL values in globals.css and referenced via CSS custom properties.
 *
 * @see https://ui.shadcn.com/docs/theming
 * @see https://tailwindcss.com/docs/configuration
 */
import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode: Use class strategy for next-themes integration
  // The .dark class is toggled on <html> element
  darkMode: "class",

  // Content paths for Tailwind to scan for class usage
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      // =======================================================================
      // Colors - shadcn/ui Design System
      // =======================================================================
      // All colors use CSS variables defined in src/app/globals.css
      // Format: hsl(var(--variable-name)) for dynamic light/dark mode switching
      colors: {
        // Base colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Card component colors
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Popover/dropdown colors
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Primary brand color (buttons, links, etc.)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        // Secondary color (less prominent actions)
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Muted elements (disabled, subtle text)
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent color (highlights, hover states)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Destructive actions (delete, error states)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // UI element colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Chart colors for data visualization
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        // Sidebar component colors
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // =======================================================================
      // Border Radius - Consistent rounding across components
      // =======================================================================
      // Uses --radius CSS variable (default: 0.5rem) for easy global adjustment
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // =======================================================================
      // Keyframe Animations
      // =======================================================================
      keyframes: {
        // Radix UI accordion animations
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        // Skeleton loading shimmer effect
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },

        // Subtle pulse for loading states
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },

        // Entry animations for components
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      // =======================================================================
      // Animation Classes
      // =======================================================================
      // Usage: className="animate-fade-in" or className="animate-shimmer"
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },

  // Tailwind plugins (none currently - can add tailwindcss-animate if needed)
  plugins: [],
};

export default config;
