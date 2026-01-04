// Twitter image for profile pages
// Note: Route segment config values must be defined directly, not re-exported
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

// Re-export the image generation function only (not generateImageMetadata)
export { default } from "./opengraph-image";
