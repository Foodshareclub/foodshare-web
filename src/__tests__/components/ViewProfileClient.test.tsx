import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ViewProfileClient } from "@/app/profile/[id]/ViewProfileClient";
import type { PublicProfile } from "@/lib/data/profiles";
import type { AuthUser } from "@/lib/data/auth";

const mockPush = mock(() => {});
const mockBack = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

const mockProfile: PublicProfile = {
  id: "user-123",
  first_name: "Elena",
  second_name: "Rostova",
  nickname: "elena_food",
  avatar_url: "https://images.unsplash.com/photo-avatar.jpg",
  about_me: "Passionate home baker and gardener sharing surplus sourdough and seasonal vegetables.",
  created_time: "2024-03-15T10:00:00Z",
  location: "POINT(14.4378 50.0755)",
  location_sharing_enabled: true,
};

const mockUser: AuthUser = {
  id: "viewer-456",
  email: "viewer@example.com",
};

describe("ViewProfileClient - Airbnb Host Profile", () => {
  it("renders Airbnb Host ID card with avatar, full name, nickname, and stats", () => {
    render(<ViewProfileClient profile={mockProfile} user={mockUser} isVolunteer={true} />);

    // Name and Nickname
    expect(screen.getByText("Elena Rostova")).toBeDefined();
    expect(screen.getByText("@elena_food")).toBeDefined();

    // Volunteer Badge
    expect(screen.getByText("🤝 Volunteer")).toBeDefined();

    // Host Credential Stats
    expect(screen.getByText("Member Since")).toBeDefined();
    expect(screen.getByText("March 2024")).toBeDefined();
    expect(screen.getByText("Location")).toBeDefined();
    expect(screen.getByText("Approximate area")).toBeDefined();
  });

  it("renders host biography in the About section", () => {
    render(<ViewProfileClient profile={mockProfile} user={mockUser} isVolunteer={false} />);

    expect(screen.getByText("About")).toBeDefined();
    expect(screen.getByText(/Passionate home baker and gardener/i)).toBeDefined();
  });

  it("renders Send Message button for authenticated users and navigates to chat", () => {
    render(<ViewProfileClient profile={mockProfile} user={mockUser} isVolunteer={false} />);

    const messageBtn = screen.getByRole("button", { name: /Send Message/i });
    expect(messageBtn).toBeDefined();

    fireEvent.click(messageBtn);
    expect(mockPush).toHaveBeenCalledWith("/chat?user=user-123");
  });

  it("renders Back button and triggers router back on click", () => {
    render(<ViewProfileClient profile={mockProfile} user={null} isVolunteer={false} />);

    const backBtn = screen.getByRole("button", { name: /Back/i });
    expect(backBtn).toBeDefined();

    fireEvent.click(backBtn);
    expect(mockBack).toHaveBeenCalled();
  });
});
