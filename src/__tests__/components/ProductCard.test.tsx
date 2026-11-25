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
    expect(screen.getByText("by Maria")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
  });
  test("shows metadata lines including listing authority and pickup line", () => {
    const { container } = render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Green St, Portland · 10:00 AM - 4:00 PM")).toBeTruthy();
    expect(screen.getByText("by Maria")).toBeTruthy();
    expect(screen.queryByText("Walk or bike")).toBeNull();
    // Media shares the listing photo ratio with the skeleton.
    expect(container.querySelector(".aspect-\\[20\\/19\\]")).toBeTruthy();
  });
  test("volunteer listing shows the role as title and the author's full name", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, post_type: "volunteer", post_name: "IT Teammate", author_name: "Denis Yarmoshko" }}
      />,
    );
    expect(screen.getByText("IT Teammate")).toBeTruthy();
    expect(screen.getByText("by Denis Yarmoshko")).toBeTruthy();
  });
  test("shows an Available badge for non-food listings", () => {
    render(<ProductCard product={{ ...baseProduct, post_type: "fridge" }} />);
    expect(screen.getByText("Available")).toBeTruthy();
    expect(screen.queryByText("Free")).toBeNull();
  });
  test("renders host entity for community fridge listings", () => {
    render(<ProductCard product={{ ...baseProduct, post_type: "fridge", host_entity: "Downtown Church" }} />);
    expect(screen.getByText("Hosted by Downtown Church")).toBeTruthy();
  });
  test("renders fallback host for community fridge listings without host entity", () => {
    render(<ProductCard product={{ ...baseProduct, post_type: "fridge", host_entity: null }} />);
    expect(screen.getByText("Community Fridge")).toBeTruthy();
  });
  test("exposes a labelled, pressable save button", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByRole("button", { name: "Save listing" }).getAttribute("aria-pressed")).toBe("false");
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

  test("keeps food bank listings to the title and one muted line", () => {
    const foodbankProduct: InitialProductStateType = {
      ...baseProduct,
      post_type: "foodbank",
      post_name: "Oregon Food Bank",
      host_entity: "Oregon Food Bank",
    };
    render(<ProductCard product={foodbankProduct} />);

    expect(screen.getAllByText("Oregon Food Bank").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hosted by/)).toBeNull();
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
  test("renders a stored reference cover cleanly without redundant disclosure overlays", () => {
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
    expect(screen.queryByTestId("cover-credit")).toBeNull();
    expect(screen.queryByText("Reference image; not a photograph of the listed item")).toBeNull();
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
