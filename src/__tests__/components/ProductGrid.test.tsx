import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";

afterEach(cleanup);

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), refresh: mock() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/food",
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAdmin: false }),
}));

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      active_listings: "Active Listings",
      "Home.categories_title": "Browse Categories",
      "Home.categories_subtitle": "Find what you need or share what you can",
      "categories.food": "Food",
      "categories.zerowaste": "Zero Waste",
      "categories.things": "Things",
      "categories.borrow": "Borrow",
      "categories.wanted": "Wanted",
      "categories.fridges": "Fridges",
      "categories.foodbanks": "FoodBanks",
      "categories.volunteers": "Volunteers",
    };
    return messages[key] || key;
  },
}));

mock.module("@/components/productCard/SkeletonCard", () => ({
  default: () => <div data-testid="skeleton-card" />,
}));

import { ProductGrid } from "@/components/productCard/ProductGrid";
import type { InitialProductStateType } from "@/types/product.types";

const mockProducts = [
  {
    id: 1,
    post_name: "Fresh Sourdough Bread",
    post_type: "food",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    post_name: "Organic Apples",
    post_type: "food",
    created_at: "2026-01-02T00:00:00Z",
  },
] as unknown as InitialProductStateType[];

describe("ProductGrid - Airbnb Listing Feed", () => {
  it("renders product cards when loaded", () => {
    render(<ProductGrid products={mockProducts} isLoading={false} hasMore={false} />);

    expect(screen.getByText("Fresh Sourdough Bread")).toBeDefined();
    expect(screen.getByText("Organic Apples")).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("renders skeletons when isLoading is true", () => {
    render(<ProductGrid products={[]} isLoading={true} hasMore={false} />);

    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(10);
  });
});
