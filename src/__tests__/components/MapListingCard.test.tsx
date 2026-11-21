import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => ({ close: "Close" })[key] ?? key,
}));

mock.module("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
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
