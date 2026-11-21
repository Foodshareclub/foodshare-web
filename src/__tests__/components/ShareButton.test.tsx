import { describe, expect, it, mock } from "bun:test";
import { ShareButton } from "@/components/share/ShareButton";
import { fireEvent, render, screen } from "@testing-library/react";

describe("ShareButton - Airbnb Share Element", () => {
  it("renders trigger icon button with accessible aria-label", () => {
    render(<ShareButton url="https://foodshare.club/food/1" title="Fresh Apples" variant="icon" />);

    const button = screen.getByRole("button", { name: "Share this listing" });
    expect(button).toBeDefined();
    expect(button.className).toContain("rounded-full");
  });

  it("renders default variant with pill styling and Share label", () => {
    render(<ShareButton url="https://foodshare.club/food/1" title="Fresh Apples" variant="default" />);

    const button = screen.getByRole("button", { name: "Share this listing" });
    expect(button.textContent).toContain("Share");
  });

  it("opens elevated dropdown menu and shows share options", async () => {
    render(<ShareButton url="https://foodshare.club/food/1" title="Fresh Apples" defaultOpen={true} />);

    expect(await screen.findByText("Share this listing")).toBeDefined();
    expect(screen.getByText("Copy link")).toBeDefined();
    expect(screen.getByText("WhatsApp")).toBeDefined();
    expect(screen.getByText("Telegram")).toBeDefined();
    expect(screen.getByText("X (Twitter)")).toBeDefined();
    expect(screen.getByText("Facebook")).toBeDefined();
    expect(screen.getByText("Email")).toBeDefined();
  });

  it("copies url to clipboard and shows feedback when Copy link is clicked", async () => {
    const writeTextMock = mock(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<ShareButton url="https://foodshare.club/food/1" title="Fresh Apples" defaultOpen={true} />);

    const copyItem = await screen.findByText("Copy link");
    fireEvent.click(copyItem);

    expect(writeTextMock).toHaveBeenCalledWith("https://foodshare.club/food/1");
    expect(await screen.findByText("Link copied!")).toBeDefined();
  });
});
