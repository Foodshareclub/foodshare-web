import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const updateListing = mock(async (_id: number, _data: Record<string, unknown>) => ({ success: true }));
mock.module("@/app/actions/admin-listings", () => ({ updateListing }));
mock.module("next/navigation", () => ({ useRouter: () => ({ push: mock(), refresh: mock() }) }));
mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
mock.module("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { ListingEditModal } from "@/app/admin/listings/ListingEditModal";
import type { AdminListing } from "@/lib/data/admin-listings";

afterEach(() => {
  cleanup();
  updateListing.mockClear();
});

const listing: AdminListing = {
  id: 11590,
  profile_id: "p1",
  post_name: "IT Teammate",
  post_description: "Keeps the lights on",
  post_type: "volunteer",
  pickup_time: null,
  available_hours: null,
  post_address: null,
  condition: "room for more",
  images: null,
  is_active: true,
  is_arranged: false,
  post_arranged_to: null,
  post_arranged_at: null,
  post_views: 3,
  post_like_counter: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  admin_notes: null,
  status: "approved",
  profile: { id: "p1", first_name: "Denis", second_name: "Yarmoshko", email: "d@example.org", avatar_url: null },
};

describe("ListingEditModal: volunteer skills (posts.condition)", () => {
  test("a volunteer listing exposes an editable skills field that is saved", async () => {
    render(<ListingEditModal listing={listing} open onClose={mock()} />);
    const skills = screen.getByLabelText("Skills") as HTMLInputElement;
    expect(skills.value).toBe("room for more");
    expect(skills.maxLength).toBe(20);
    fireEvent.change(skills, { target: { value: " Driving,Cooking " } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    await waitFor(() => expect(updateListing).toHaveBeenCalledTimes(1));
    expect(updateListing.mock.calls[0][0]).toBe(11590);
    expect(updateListing.mock.calls[0][1]).toMatchObject({ post_name: "IT Teammate", condition: "Driving,Cooking" });
  });

  test("other listing types have no skills field and never send a condition", async () => {
    render(<ListingEditModal listing={{ ...listing, post_type: "food", condition: "fresh" }} open onClose={mock()} />);
    expect(screen.queryByLabelText("Skills")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    await waitFor(() => expect(updateListing).toHaveBeenCalledTimes(1));
    expect(updateListing.mock.calls[0][1].condition).toBeUndefined();
  });
});
