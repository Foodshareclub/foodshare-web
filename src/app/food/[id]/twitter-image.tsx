// Twitter image - re-exports the OpenGraph image with its own config
// Next.js requires runtime/config to be defined directly, not re-exported
export const runtime = 'edge';
export const alt = 'FoodShare Listing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export { default } from './opengraph-image';
