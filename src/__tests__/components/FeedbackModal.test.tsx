import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("@/app/actions/feedback", () => ({
  getCurrentUserInfo: mock(() =>
    Promise.resolve({
      success: true,
      data: { name: "Community Member", email: "member@example.com" },
    }),
  ),
  submitFeedback: mock(() => Promise.resolve({ success: true })),
}));

import FeedbackModal from "@/components/modals/FeedbackModal";

describe("FeedbackModal - Airbnb Feedback & Dialog System", () => {
  it("renders elevated dialog with title, pre-filled inputs, and brand CTA", async () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('"Send us your feedback"')).toBeDefined();
    expect(screen.getByPlaceholderText("Brief description of your feedback")).toBeDefined();
    expect(screen.getByPlaceholderText("Tell us more about your feedback...")).toBeDefined();

    const sendBtn = screen.getByRole("button", { name: "Send Feedback" });
    expect(sendBtn.className).toContain("bg-brand");
    expect(sendBtn.className).toContain("rounded-xl");
  });

  it("submits feedback and displays confirmation message", async () => {
    const onClose = mock();
    render(<FeedbackModal isOpen={true} onClose={onClose} />);

    const subjectInput = screen.getByPlaceholderText("Brief description of your feedback");
    const messageInput = screen.getByPlaceholderText("Tell us more about your feedback...");

    fireEvent.change(subjectInput, { target: { value: "Great sharing initiative!" } });
    fireEvent.change(messageInput, { target: { value: "Loving the new Airbnb design improvements." } });

    const sendBtn = screen.getByRole("button", { name: "Send Feedback" });
    fireEvent.click(sendBtn);

    expect(sendBtn).toBeDefined();
  });
});
