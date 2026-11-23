import { describe, expect, it, mock } from "bun:test";
import type { InitialProductStateType } from "@/types/product.types";
import { render, screen } from "@testing-library/react";

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: unknown; alt: string; className?: string }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt} className={className} />
  ),
}));

import { VolunteerGrid } from "@/components/volunteers/VolunteerGrid";
import { VolunteerPostcard } from "@/components/volunteers/VolunteerPostcard";

const mockVolunteer: InitialProductStateType = {
  id: 101,
  post_name: "Sarah Connor - Sustainable Chef & Driver",
  post_description: "Passionate about zero-waste cooking and deliveries.",
  post_type: "volunteer",
  images: ["https://example.com/sarah.jpg"],
  condition: "Cooking, Driving, Outreach",
  available_hours: "Weekends",
  post_address: "Downtown, Foodville",
  post_stripped_address: "Downtown",
  profile_id: "user-101",
  created_at: "2026-01-01T00:00:00Z",
  post_like_counter: 12,
  post_views: 45,
  is_active: true,
} as unknown as InitialProductStateType;

describe("VolunteerPostcard - Airbnb Host Volunteer Card", () => {
  it("renders volunteer host card with parsed name, headline, skills, and availability", () => {
    render(<VolunteerPostcard volunteer={mockVolunteer} isFeatured={true} />);

    // Name and headline
    expect(screen.getByText("Sarah Connor")).toBeDefined();
    expect(screen.getByText("“Sustainable Chef & Driver”")).toBeDefined();

    // Featured badge
    expect(screen.getByText("Featured")).toBeDefined();

    // Skills
    expect(screen.getByText("Cooking")).toBeDefined();
    expect(screen.getByText("Driving")).toBeDefined();
    expect(screen.getByText("Outreach")).toBeDefined();

    // Location and availability
    expect(screen.getByText("Downtown")).toBeDefined();
    expect(screen.getByText("Weekends")).toBeDefined();
  });
});

describe("VolunteerGrid - Airbnb Community Grid", () => {
  it("renders volunteer cards in grid", () => {
    render(<VolunteerGrid volunteers={[mockVolunteer]} isLoading={false} />);

    expect(screen.getByText("Sarah Connor")).toBeDefined();
  });

  it("renders warm empty state with become a volunteer call-to-action when list is empty", () => {
    render(<VolunteerGrid volunteers={[]} isLoading={false} />);

    expect(screen.getByText("No volunteers yet")).toBeDefined();
    expect(screen.getByText("Be the first to join our community of food heroes and sharers!")).toBeDefined();

    const cta = screen.getByRole("button", { name: "Become a Volunteer" });
    expect(cta).toBeDefined();
    expect(cta.className).toContain("bg-brand");
  });
});
