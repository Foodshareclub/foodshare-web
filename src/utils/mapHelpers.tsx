/**
 * Map Helper Utilities
 * Helper functions for map-related operations
 */

import { escapeHtml } from "@/lib/strings";
import type { InitialProductStateType } from "@/types/product.types";
import { getProductDetailUrl } from "@/utils/categoryMapping";

/**
 * Generates HTML for product popup in vanilla Leaflet
 * Note: Uses raw <img> intentionally — Leaflet popups render vanilla HTML strings,
 * not React components, so next/image cannot be used here.
 *
 * SECURITY: Leaflet's `bindPopup` writes this string via `innerHTML`, so every
 * interpolated value is a stored-XSS sink — `post_name`, `post_type` and
 * `images[0]` are all user-controlled. Everything goes through `escapeHtml`.
 * The CTA is an `<a href>` rather than `onclick=` for the same reason: a raw
 * event-handler attribute needs `script-src-attr` (a nonce does not allow it),
 * and building the URL in JS means an injected `post_type` could redirect off-
 * origin. A native link with an escaped href needs no script at all.
 *
 * @param product - Product data
 * @param productType - Category type (fallback; `product.post_type` wins)
 */
export const generateProductPopupHTML = (product: InitialProductStateType, productType: string): string => {
  const name = product.post_name ?? "";
  const postType = product.post_type ?? productType;
  const imageUrl = product.images?.[0];

  const imageHtml = imageUrl
    ? `<img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(name)}"
        class="product-popup-image"
      />`
    : "";

  const distance = (product as unknown as { distance?: number }).distance;
  const distanceHtml =
    typeof distance === "number" ? `<p class="product-popup-distance">📍 ${distance.toFixed(1)} km away</p>` : "";

  // Canonical detail URL — `/product/{id}` for post-backed types, so this no
  // longer round-trips through the legacy 308 redirect (`/thing/{id}` → `/product/{id}`).
  const href = escapeHtml(getProductDetailUrl(postType, product.id));

  return `
    <div class="product-popup-card">
      ${imageHtml}
      <h4 class="product-popup-title">${escapeHtml(name)}</h4>
      <span class="product-popup-badge">${escapeHtml(postType)}</span>
      ${distanceHtml}
      <a
        href="${href}"
        class="product-popup-button"
      >
        View Details
      </a>
    </div>
  `;
};
