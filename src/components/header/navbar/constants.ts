/**
 * Navbar Design Tokens
 * Based on Airbnb Navbar Research - Section 7: Visual Design Tokens
 */

// Colors (Section 7)
export const COLORS = {
  // FoodShare brand colors
  primary: "#FF2D55",
  primaryHover: "#E6284D",

  // Background
  backgroundWhite: "#FFFFFF",

  // Borders
  borderGray: "#DDDDDD",

  // Text
  textPrimary: "#222222",
  textSecondary: "#717171",

  // Shadows
  shadow: "rgba(0, 0, 0, 0.08)",
} as const;

// Typography (Section 7)
export const TYPOGRAPHY = {
  fontFamily: {
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fallback: "system-ui, sans-serif",
  },
  fontSize: {
    searchText: "14px",
    categoryLabel: "12px",
    menuItem: "14px",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// Spacing & Sizing (Section 7)
export const SPACING = {
  navbar: {
    heightExpanded: "80px",
    heightCompact: "64px",
  },
  categoryBar: {
    height: "78px",
  },
  borderRadius: {
    search: "40px", // Full pill
    button: "8px",
  },
  padding: {
    desktop: "24px",
    mobile: "16px",
  },
} as const;

// Shadows & Elevation (Section 7)
export const SHADOWS = {
  navbar: "0 1px 2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)",
  searchBarHover: "0 2px 4px rgba(0, 0, 0, 0.18)",
  dropdown: "0 2px 16px rgba(0, 0, 0, 0.12)",
} as const;

// Transitions (Section 8)
export const TRANSITIONS = {
  quick: "0.2s ease",
  smooth: "0.3s ease",
  searchBarHover: "200ms ease",
  categorySelection: "200ms ease",
  menuDropdown: "200ms ease",
} as const;

// Breakpoints (Section 11)
export const BREAKPOINTS = {
  mobile: "743px",
  tablet: "744px",
  tabletMax: "1127px",
  desktop: "1128px",
  largeDesktop: "1440px",
  maxContentWidth: "1760px",
} as const;

// Z-Index Layers
export const Z_INDEX = {
  navbar: 1000,
  categoryBar: 999,
  dropdown: 1001,
  modal: 1002,
} as const;

// Animation Durations
export const ANIMATION = {
  scrollHide: "300ms",
  categorySlide: "200ms",
  iconScale: "200ms",
} as const;
