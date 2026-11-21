import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ProductPopup } from "@/components/map/ProductPopup";

const mockPush = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

describe("ProductPopup - Airbnb Map Card", () => {
  it("renders listing title, type badge, distance, and image", () => {
    render(
      <ProductPopup
        id={101}
        productType="food"
        name="Fresh Organic Apples"
        type="food"
        address="Downtown, Prague"
        image="https://images.unsplash.com/photo-apple.jpg"
        distance={2.4}
      />,
    );

    expect(screen.getByText("Fresh Organic Apples")).toBeDefined();
    expect(screen.getByText("food")).toBeDefined();
    expect(screen.getByText("📍 2.4 km away")).toBeDefined();
    expect(screen.getByText("📍 Downtown, Prague")).toBeDefined();

    const img = screen.getByRole("img", { name: "Fresh Organic Apples" });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://images.unsplash.com/photo-apple.jpg");
  });

  it("renders organic fallback placeholder when image is not provided", () => {
    const { container } = render(<ProductPopup id={102} productType="thing" name="Cast Iron Pan" type="thing" />);

    expect(screen.getByText("Cast Iron Pan")).toBeDefined();
    const placeholder = container.querySelector(".product-popup-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toContain("🍲");
  });

  it("navigates to product detail on View Details click", () => {
    render(<ProductPopup id={103} productType="food" name="Artisan Bread" />);

    const button = screen.getByRole("button", { name: "View Details" });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/product/103");
  });
});
