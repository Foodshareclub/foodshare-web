import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

const mockPush = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

import SearchModal from "@/components/modals/SearchModal";

describe("SearchModal - Airbnb Search Experience", () => {
  it("renders search modal dialog with header, input, and category chips", () => {
    render(<SearchModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Search FoodShare")).toBeDefined();
    expect(screen.getByPlaceholderText("What are you looking for?")).toBeDefined();

    // Default category 'All' selected
    const allChip = screen.getByRole("radio", { name: "All" });
    expect(allChip).toBeDefined();
    expect(allChip.getAttribute("aria-checked")).toBe("true");

    // Other categories present
    const foodChip = screen.getByRole("radio", { name: "Food" });
    expect(foodChip).toBeDefined();
    expect(foodChip.getAttribute("aria-checked")).toBe("false");
  });

  it("updates selected category when chip is clicked", () => {
    render(<SearchModal isOpen={true} onClose={() => {}} />);

    const foodChip = screen.getByRole("radio", { name: "Food" });
    fireEvent.click(foodChip);

    expect(foodChip.getAttribute("aria-checked")).toBe("true");
    const allChip = screen.getByRole("radio", { name: "All" });
    expect(allChip.getAttribute("aria-checked")).toBe("false");
  });

  it("navigates to category route with keyword on search submit", () => {
    mockPush.mockClear();
    render(<SearchModal isOpen={true} onClose={() => {}} />);

    const foodChip = screen.getByRole("radio", { name: "Food" });
    fireEvent.click(foodChip);

    const input = screen.getByPlaceholderText("What are you looking for?");
    fireEvent.change(input, { target: { value: "Organic Bread" } });

    const searchBtn = screen.getByRole("button", { name: "search listings" });
    fireEvent.click(searchBtn);

    expect(mockPush).toHaveBeenCalledWith("/food?key_word=Organic%20Bread");
  });
});
