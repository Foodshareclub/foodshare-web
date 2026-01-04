// Twitter image for help page
// Note: Route segment config values must be defined directly, not re-exported
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// Re-export the image generation function
export { default } from "./opengraph-image";
