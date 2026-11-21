import { afterEach, describe, expect, mock, test } from "bun:test";
import { ProductCard } from "@/components/productCard/ProductCard";
import type { InitialProductStateType } from "@/types/product.types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), refresh: mock() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/food",
}));

mock.module("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { defaultMessage?: string }) => opts?.defaultMessage || key,
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAdmin: false }),
}));

mock.module("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    onError,
  }: {
    src: string;
    alt: string;
    className?: string;
    onError?: () => void;
  }) => <img src={src} alt={alt} className={className} onError={onError} />,
}));

afterEach(cleanup);

const baseProduct: InitialProductStateType = {
  id: 101,
  post_name: "Fresh Organic Avocados",
  post_description: "Ripe Haas avocados ready for pickup",
  post_type: "food",
  available_hours: "10:00 AM - 4:00 PM",
  condition: "fresh",
  created_at: new Date().toISOString(),
  five_star: null,
  four_star: null,
  images: ["https://api.foodshare.club/storage/v1/object/public/food-images/user/avocado.jpg"],
  location: "0101000020E610000000000000000000000000000000000000",
  post_address: "123 Green St, Portland, OR",
  post_stripped_address: "123 Green St, Portland",
  is_arranged: false,
  post_like_counter: 5,
  transportation: "Walk or bike",
  is_active: true,
  post_views: 120,
  profile_id: "user-123",
  author_name: "Maria Silva",
};

describe("ProductCard Airbnb Design", () => {
  test("renders listing title, link, and Airbnb 'New' badge when no ratings exist", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("Fresh Organic Avocados")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText(/By Maria/)).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText("Available")).toBeTruthy();
  });

  test("renders Airbnb star rating score when ratings exist", () => {
    const ratedProduct: InitialProductStateType = {
      ...baseProduct,
      five_star: 4,
      four_star: 1,
    };
    render(<ProductCard product={ratedProduct} />);

    // ((4 * 5) + (1 * 4)) / 5 = 24 / 5 = 4.8
    expect(screen.getByText("4.8")).toBeTruthy();
    expect(screen.getByText("(5)")).toBeTruthy();
  });

  test("renders 'Reserved' badge when product is arranged", () => {
    const arrangedProduct: InitialProductStateType = {
      ...baseProduct,
      is_arranged: true,
    };
    render(<ProductCard product={arrangedProduct} />);

    expect(screen.getByText("Reserved")).toBeTruthy();
  });

  test("renders organization host attribution when post is foodbank", () => {
    const foodbankProduct: InitialProductStateType = {
      ...baseProduct,
      post_type: "foodbank",
      host_entity: "Oregon Food Bank",
    };
    render(<ProductCard product={foodbankProduct} />);

    expect(screen.getByText("Oregon Food Bank")).toBeTruthy();
  });

  test("shows the transient finding-a-photo state instead of the static icon when images are empty", () => {
    render(<ProductCard product={{ ...baseProduct, images: [] }} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Finding a photo for this Community Food listing…");
    expect(screen.queryByTestId("cover-credit")).toBeNull();
  });
  test("shows the transient state when every image fails to load", () => {
    render(<ProductCard product={baseProduct} />);
    fireEvent.error(screen.getByAltText("Fresh Organic Avocados"));
    expect(screen.getByTestId("finding-photo")).toBeTruthy();
  });
  test("renders a stored reference cover with disclosure and source/license credit", () => {
    const cover = {
      kind: "reference",
      provider: "wikimedia-commons",
      sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Avocado.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      artist: "<a href='x'>Jane Doe</a>",
      disclosure: "Reference image; not a photograph of the listed item",
    };
    render(
      <ProductCard
        product={{
          ...baseProduct,
          images: [
            "https://api.foodshare.club/storage/v1/object/public/food-images/user/reference-covers/" +
              "a".repeat(64) +
              ".jpeg",
          ],
          metadata: { cover },
        }}
      />,
    );
    expect(screen.getByText("Reference image; not a photograph of the listed item")).toBeTruthy();
    const source = screen.getByText(/Source: Wikimedia Commons · Jane Doe/).closest("a");
    expect(source?.getAttribute("href")).toBe(cover.sourcePageUrl);
    expect(source?.getAttribute("target")).toBe("_blank");
    expect(source?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("CC BY-SA 4.0").closest("a")?.getAttribute("href")).toBe(cover.licenseUrl);
  });
  test("ignores malformed cover provenance", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, metadata: { cover: { kind: "reference", sourcePageUrl: "javascript:alert(1)" } } }}
      />,
    );
    expect(screen.queryByTestId("cover-credit")).toBeNull();
  });
});
