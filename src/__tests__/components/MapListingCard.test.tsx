import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => ({ close: "Close" })[key] ?? key,
}));

mock.module("next/image", () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    <img src={src} alt={alt} onError={onError} />
  ),
}));

import { MapListingCard, MapPreviewCard } from "@/components/map/MapListingCard";

const item = { id: 7, post_name: "Bread rolls", post_type: "food", images: ["https://example.com/a.jpg"] };

describe("MapListingCard", () => {
  it("links the whole card to the listing and reports hover", () => {
    const hovered: Array<number | null> = [];
    render(<MapListingCard item={item} productType="food" onHover={(id) => hovered.push(id)} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/product/7");
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    expect(hovered).toEqual([7, null]);
  });

  it("marks the selected card and shows finding-a-photo without an image", () => {
    render(<MapListingCard item={{ ...item, images: [] }} productType="food" selected />);
    expect(screen.getByRole("link").getAttribute("aria-current")).toBe("true");
    expect(screen.getByTestId("finding-photo")).toBeDefined();
  });

  it("preview card closes from its labelled button", () => {
    let closed = false;
    render(<MapPreviewCard item={item} productType="food" onClose={() => (closed = true)} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closed).toBe(true);
  });
});

afterEach(cleanup);
const base = "https://api.foodshare.club/storage/v1/object/public/food-images/u";
const broken = `${base}/old.jpg`;
const repaired = `${base}/reference-covers/${"b".repeat(64)}.jpeg`;
const recoveryItem = { id: 1, post_name: "Apples", post_type: "food", images: [broken] };

for (const variant of ["list", "preview"] as const) {
  const card = (images: string[]) =>
    variant === "list" ? (
      <MapListingCard item={{ ...recoveryItem, images }} productType="food" />
    ) : (
      <MapPreviewCard item={{ ...recoveryItem, images }} productType="food" onClose={() => {}} />
    );
  describe(`${variant} map cover recovery`, () => {
    it("tries the next stored image after a download fails", () => {
      const view = render(card([broken, repaired]));
      fireEvent.error(view.container.querySelector("img")!);
      expect(view.container.querySelector("img")?.getAttribute("src")).toBe(repaired);
      expect(screen.queryByTestId("finding-photo")).toBeNull();
    });
    it("renders a repaired backend cover after the previous URL failed", () => {
      const view = render(card([broken]));
      fireEvent.error(view.container.querySelector("img")!);
      expect(screen.getByTestId("finding-photo")).toBeTruthy();
      view.rerender(card([repaired]));
      expect(view.container.querySelector("img")?.getAttribute("src")).toBe(repaired);
      expect(screen.queryByTestId("finding-photo")).toBeNull();
    });
  });
}
