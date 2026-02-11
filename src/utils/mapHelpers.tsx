/**
 * Map Helper Utilities
 * Helper functions for map-related operations
 */

import type { InitialProductStateType } from "@/types/product.types";

/**
 * Generates HTML for product popup in vanilla Leaflet
 * Note: Uses raw <img> intentionally — Leaflet popups render vanilla HTML strings,
 * not React components, so next/image cannot be used here.
 * @param product - Product data
 * @param productType - Category type for navigation
 */
export const generateProductPopupHTML = (
  product: InitialProductStateType,
  productType: string
): string => {
  const imageHtml =
    product.images && product.images[0]
      ? `<img
        src="${product.images[0]}"
        alt="${product.post_name}"
        class="product-popup-image"
      />`
      : "";

  const distanceHtml = (product as unknown as { distance?: number }).distance
    ? `<p class="product-popup-distance">📍 ${(product as unknown as { distance?: number }).distance!.toFixed(1)} km away</p>`
    : "";

  return `
    <div class="product-popup-card">
      ${imageHtml}
      <h4 class="product-popup-title">${product.post_name}</h4>
      <span class="product-popup-badge">${product.post_type}</span>
      ${distanceHtml}
      <button
        onclick="window.location.href='/${productType}/${product.id}'"
        class="product-popup-button"
      >
        View Details
      </button>
    </div>
  `;
};
