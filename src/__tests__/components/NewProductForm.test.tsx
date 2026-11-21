import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

const mockBack = mock(() => {});
const mockPush = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      category: "Category",
      item_name: "Item Name",
      description: "Description",
      address: "Address",
      cancel: "Cancel",
      create_listing: "Create Listing",
      creating: "Creating...",
      upload_photos: "Upload Photos",
      food: "Food",
      things: "Non-Food",
      volunteer: "Volunteer / Skill",
      transportation: "Transportation",
      available_hours: "Available Hours",
    };
    return translations[key] || key;
  },
}));

mock.module("@/app/actions/products", () => ({
  createProduct: mock(() => Promise.resolve({ success: true })),
}));

mock.module("@/app/actions/ai-draft", () => ({
  generateListingDraft: mock(() => Promise.resolve({ success: true, draft: {} })),
}));

mock.module("@/api/imageAPI", () => ({
  imageAPI: {
    uploadImage: mock(() => Promise.resolve("https://example.com/uploaded.jpg")),
  },
}));

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: unknown; alt: string; className?: string }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt} className={className} />
  ),
}));

import { NewProductForm } from "@/app/food/new/NewProductForm";

describe("NewProductForm - Airbnb Host Creation Form", () => {
  it("renders elevated host creation form with header and pill back button", () => {
    render(<NewProductForm userId="test-user-id" initialType="food" />);

    // Header Back button
    const backButton = screen.getByRole("button", { name: /Back/i });
    expect(backButton).toBeDefined();
    expect(backButton.className).toContain("rounded-full");

    // Title & description
    expect(screen.getByText("Create New Listing")).toBeDefined();
    expect(screen.getByText("Share food items or services with your community")).toBeDefined();

    // Primary action submit button with Airbnb brand gradient
    const submitBtn = screen.getByRole("button", { name: "Create Listing" });
    expect(submitBtn).toBeDefined();
    expect(submitBtn.className).toContain("bg-gradient-to-r");
    expect(submitBtn.className).toContain("from-[#FF2D55]");
    expect(submitBtn.className).toContain("to-[#FF385C]");
  });

  it("calls router.back when clicking back button", () => {
    mockBack.mockClear();
    render(<NewProductForm userId="test-user-id" initialType="food" />);

    const backButton = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it("renders volunteer host form when initialType is volunteer", () => {
    render(<NewProductForm userId="test-user-id" initialType="volunteer" />);

    expect(screen.getByText("Become a Volunteer")).toBeDefined();
    expect(screen.getByText("Join our community of food heroes making a difference")).toBeDefined();

    const volunteerSubmit = screen.getByRole("button", { name: "Submit My Volunteer Application" });
    expect(volunteerSubmit).toBeDefined();
    expect(volunteerSubmit.className).toContain("bg-gradient-to-r");
    expect(volunteerSubmit.className).toContain("from-[#FF2D55]");
  });
});
