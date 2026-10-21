// Note: Chakra UI v3 uses createSystem and defineConfig for theming
// This is a temporary compatibility export while migrating
const breakpoints = {
  sm: "320px",
  ss: "500px",
  mm: "550px",
  md: "768px",
  lg: "960px",
  xl: "1200px",
  "2xl": "1536px",
};

// Export a simple config object for compatibility
export const theme = {
  breakpoints,
  fonts: {
    heading: `'Open Sans', sans-serif`,
  },
};
