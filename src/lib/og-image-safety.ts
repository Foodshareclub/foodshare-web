/**
 * Guards for the text and the pictures that reach an open-graph card.
 *
 * The card is drawn as an SVG, and the things drawn on it are written by
 * whoever made the listing: the name of the listing, its description, and
 * the address of its picture. The renderer escapes the text it draws, and
 * the picture is held to the same rule as every other image the app shows.
 * These are the checks beneath that, so a listing cannot carry markup of
 * its own into a card if the renderer is changed, or if the card is drawn
 * by a version of the renderer that does not escape.
 *
 * @module lib/og-image-safety
 */

import { normalizeImageUrl } from "@/lib/image";

/**
 * Strip the characters that could start or end an element in the SVG the
 * card is drawn from.
 *
 * The ampersand is left alone: it starts an entity, and an entity is
 * decoded into text rather than into markup.
 */
export function stripSvgText(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/[<>]/g, "");
}

/**
 * The picture to draw behind a card.
 *
 * The address comes out of the listing, so it is held to the same rule as
 * every other image the app shows: an absolute address on a configured
 * host. That also keeps the renderer from being asked to fetch an address
 * of the listing's choosing, and keeps a character that would end the
 * style the address is written into from surviving.
 *
 * @returns the address, or `undefined` when there is no address to draw.
 */
export function safeOgImageUrl(url: string | undefined): string | undefined {
  const normalized = normalizeImageUrl(url);
  // A relative path is not an address the renderer can fetch, and it has
  // not been through the checks an absolute one has.
  if (!normalized?.startsWith("https://")) return undefined;
  return normalized;
}
