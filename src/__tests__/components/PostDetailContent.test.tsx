import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      author: "Author",
      available: "Available Hours",
      description: "Description",
      transport: "Transportation",
      contact_sharer: "Contact Sharer",
      login_to_contact: "Login to Contact",
      location_approximate_disclaimer: "Location shown is approximate for privacy",
    };
    return translations[key] || key;
  },
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    back: () => {},
  }),
}));

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

mock.module("@/components/share/ShareButton", () => ({
  ShareButton: () => (
    <button type="button" aria-label="Share">
      Share
    </button>
  ),
}));

mock.module("@/components/reports", () => ({
  ReportPostDialog: () => <div data-testid="report-dialog" />,
}));

mock.module("@/app/actions/post-engagement", () => ({
  togglePostLike: mock(() => Promise.resolve({ success: true, data: { isLiked: true, likeCount: 13 } })),
}));

import { PostDetailContent } from "@/app/food/[id]/PostDetailContent";
import type { InitialProductStateType } from "@/types/product.types";

const basePost: InitialProductStateType = {
  id: 201,
  post_name: "Fresh Bread Loaf",
  post_description: "Artisan sourdough loaf baked this morning.",
  post_type: "food",
  available_hours: "Anytime before 6pm",
  condition: "fresh",
  created_at: new Date().toISOString(),
  five_star: null,
  four_star: null,
  images: ["https://example.com/bread.jpg"],
  location: "0101000020E610000000000000000000000000000000000000",
  post_address: "456 Baker St, San Francisco, CA",
  post_stripped_address: "456 Baker St, San Francisco",
  is_arranged: false,
  post_like_counter: 12,
  transportation: "Curbside pickup",
  is_active: true,
  post_views: 88,
  profile_id: "user-456",
  author_name: "Elena Rostova",
};

describe("PostDetailContent - Airbnb Detail Layout", () => {
  it("renders listing title, New rating badge, and Available status at the top", () => {
    render(<PostDetailContent post={basePost} user={null} isModal />);

    expect(screen.getByRole("heading", { level: 1, name: "Fresh Bread Loaf" })).toBeDefined();
    expect(screen.getByText("New")).toBeDefined();
    expect(screen.getByText("Available")).toBeDefined();
    expect(screen.getAllByText("Baker St, San Francisco").length).toBeGreaterThanOrEqual(1);
  });

  it("renders computed star rating score when ratings exist", () => {
    const ratedPost: InitialProductStateType = {
      ...basePost,
      five_star: 4,
      four_star: 1,
    };

    render(<PostDetailContent post={ratedPost} user={null} isModal />);

    expect(screen.getByText("4.8 (5)")).toBeDefined();
  });

  it("renders Airbnb Host attribution card with Community Sharer badge", () => {
    render(<PostDetailContent post={basePost} user={null} isModal />);

    expect(screen.getByText("Hosted by")).toBeDefined();
    expect(screen.getByText("Elena")).toBeDefined();
    expect(screen.getByText("Community Sharer")).toBeDefined();
  });

  it("renders organization attribution for foodbank listings", () => {
    const foodBankPost: InitialProductStateType = {
      ...basePost,
      post_type: "foodbank",
      host_entity: "Sacramento Food Bank",
    };

    render(<PostDetailContent post={foodBankPost} user={null} isModal />);

    expect(screen.getByText("Food Bank Entity")).toBeDefined();
    expect(screen.getByText("Sacramento Food Bank")).toBeDefined();
    expect(screen.getByText("Community Organization")).toBeDefined();
  });

  it("renders primary contact CTA and share button", () => {
    render(<PostDetailContent post={basePost} user={null} isModal />);

    expect(screen.getByRole("button", { name: "Login to Contact" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Share" }).length).toBeGreaterThanOrEqual(1);
  });

  it("renders wishlist Save button alongside Share in top actions", () => {
    render(<PostDetailContent post={basePost} user={null} isModal />);

    const saveButton = screen.getByRole("button", { name: "Save to wishlist" });
    expect(saveButton).toBeDefined();
    expect(saveButton.textContent).toContain("Save");
  });
});
