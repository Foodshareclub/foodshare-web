import { describe, expect, it } from "bun:test";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { generateOGImage } from "@/lib/og-image";
import { safeOgImageUrl, stripSvgText } from "@/lib/og-image-safety";

/**
 * The open-graph card.
 *
 * The name of a listing, its description and the address of its picture
 * are written by whoever made the listing, and they are drawn on the card
 * as an SVG. The renderer escapes the text it draws, and the picture is
 * held to the same rule as every other image the app shows.
 *
 * The tests below pin the layer beneath that, so a listing cannot carry
 * markup of its own into a card.
 */

/** A payload that draws a red panel over the whole card, if it is drawn. */
const PAYLOAD = '</text></text><rect x="0" y="0" width="1200" height="630" fill="#FF0000"/>';

/** Count the pixels that are unmistakably red. */
async function redPixels(response: Response): Promise<number> {
  const png = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let red = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] < 60) red++;
  }
  return red;
}

/** Draw a card and return the bytes. */
async function render(title: string): Promise<Buffer> {
  return Buffer.from(await generateOGImage({ title, type: "default" }).arrayBuffer());
}

describe("open-graph card text", () => {
  it("strips the characters that could start or end an element", () => {
    expect(stripSvgText("Fresh bread")).toBe("Fresh bread");
    expect(stripSvgText('<script>alert("x")</script>')).toBe('scriptalert("x")/script');
    expect(stripSvgText("</text><rect/>")).toBe("/textrect/");
  });

  it("leaves an ampersand alone", () => {
    // An ampersand starts an entity, and an entity is decoded into text
    // rather than into markup.
    expect(stripSvgText("Bread &amp; Butter")).toBe("Bread &amp; Butter");
    expect(stripSvgText("Fish & Chips")).toBe("Fish & Chips");
  });

  it("has no text to show for a value that is not a string", () => {
    expect(stripSvgText(undefined)).toBe("");
    expect(stripSvgText(null)).toBe("");
    expect(stripSvgText(42)).toBe("");
  });

  it("keeps ordinary punctuation and non-Latin text", () => {
    expect(stripSvgText("5€ < 10€ — café 🥐")).toBe("5€  10€ — café 🥐");
  });
});

describe("open-graph card picture", () => {
  it("accepts an address on a configured host", () => {
    expect(safeOgImageUrl("https://project.supabase.co/storage/v1/object/public/posts/photo.jpg")).toBe(
      "https://project.supabase.co/storage/v1/object/public/posts/photo.jpg",
    );
    expect(safeOgImageUrl("https://account.r2.cloudflarestorage.com/posts/photo.jpg")).toBe(
      "https://account.r2.cloudflarestorage.com/posts/photo.jpg",
    );
  });

  it("refuses an address on a host that is not configured", () => {
    // The renderer is asked to fetch the address, so an address of the
    // listing's choosing is an address the server is sent to.
    expect(safeOgImageUrl("https://example.com/photo.jpg")).toBeUndefined();
    expect(safeOgImageUrl("https://supabase.co.untrusted.example/photo.jpg")).toBeUndefined();
    expect(safeOgImageUrl("http://project.supabase.co/photo.jpg")).toBeUndefined();
  });

  it("refuses an address that points back at the server", () => {
    expect(safeOgImageUrl("https://127.0.0.1/photo.jpg")).toBeUndefined();
    expect(safeOgImageUrl("https://localhost/photo.jpg")).toBeUndefined();
    expect(safeOgImageUrl("https://169.254.169.254/latest/meta-data")).toBeUndefined();
  });

  it("refuses a relative path", () => {
    // A relative path is not an address the renderer can fetch, and it
    // has not been through the checks an absolute one has.
    expect(safeOgImageUrl("/images/photo.jpg")).toBeUndefined();
    expect(safeOgImageUrl("//example.com/photo.jpg")).toBeUndefined();
  });

  it("refuses nothing at all", () => {
    expect(safeOgImageUrl(undefined)).toBeUndefined();
    expect(safeOgImageUrl("")).toBeUndefined();
  });
});

describe("open-graph card rendering", () => {
  it("draws the card", async () => {
    const response = generateOGImage({ title: "Fresh sourdough", type: "default" });

    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it("does not draw the characters that could carry markup", async () => {
    // The card is drawn byte for byte the way it is drawn without the
    // characters, so they are not on it.
    expect(await render("Fresh < bread")).toEqual(await render("Fresh  bread"));
  });

  it("does draw the characters that cannot carry markup", async () => {
    // The check above is only worth something if the card draws its text
    // at all. An ampersand is not one of the characters that are taken
    // out, and it changes the card.
    expect(await render("Fresh & bread")).not.toEqual(await render("Fresh  bread"));
  });

  it("does not draw a listing name as markup", async () => {
    const response = generateOGImage({ title: PAYLOAD, subtitle: PAYLOAD, type: "default" });

    expect(await redPixels(response)).toBe(0);
  });

  it("can see an injection when there is one", async () => {
    // The check above is only worth anything if it would notice an
    // injection. A red panel drawn the ordinary way has to be counted.
    const control = new ImageResponse(
      <svg width="1200" height="630">
        <title>Control panel</title>
        <rect x="0" y="0" width="1200" height="630" fill="#FF0000" />
      </svg>,
      { width: 1200, height: 630 },
    );

    expect(await redPixels(control)).toBeGreaterThan(0);
  });
});
