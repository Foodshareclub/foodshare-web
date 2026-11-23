import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      would_you_like_to_leave_feedback: "Would you like to leave feedback?",
      rate_your_experience: "Rate your experience",
      please_write_your_feedback: "Please write your feedback...",
      feedback_text: "Feedback text",
      congratulations_you_guys_made_it: "Congratulations!",
      yes: "Yes",
      send: "Send",
      sending: "Sending...",
    };
    return translations[key] || key;
  },
}));

mock.module("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ id: "post-123" }),
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

mock.module("next/image", () => ({
  default: ({ src, alt, className }: { src: unknown; alt: string; className?: string }) => (
    <div data-testid="mock-img" className={className} />
  ),
}));

mock.module("@/app/actions/chat", () => ({
  writeReview: mock(() => Promise.resolve({ success: true })),
}));

import PopupNotificationModal from "@/components/modals/PopupNotificationModal";

describe("PopupNotificationModal - Airbnb Review & Feedback Dialog", () => {
  it("renders congratulations step and prompt to leave feedback", () => {
    render(<PopupNotificationModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Would you like to leave feedback?")).toBeDefined();
    const yesButton = screen.getByRole("button", { name: "Yes" });
    expect(yesButton).toBeDefined();
    expect(yesButton.className).toContain("bg-brand");
    expect(yesButton.className).toContain("rounded-xl");
  });

  it("transitions to rating step and renders tactile star buttons on Yes click", () => {
    render(<PopupNotificationModal isOpen={true} onClose={() => {}} />);

    const yesButton = screen.getByRole("button", { name: "Yes" });
    fireEvent.click(yesButton);

    const starsFieldset = screen.getByRole("group", { name: "Rate your experience" });
    expect(starsFieldset).toBeDefined();

    const textarea = screen.getByPlaceholderText("Please write your feedback...");
    expect(textarea).toBeDefined();

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDefined();
  });
});
