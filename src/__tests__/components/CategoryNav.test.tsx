import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      food: "Food",
      things: "Things",
      borrow: "Borrow",
      wanted: "Wanted",
      foodbanks: "Food Banks",
      fridges: "Community Fridges",
      volunteers: "Volunteers",
      challenges: "Challenges",
    };
    return translations[key] || key;
  },
}));

import CategoryNav from "@/components/ui-library/CategoryNav";

describe("CategoryNav - Airbnb Pill & Tab Navigation", () => {
  it("renders category navigation with tabs and accessible labels", () => {
    render(<CategoryNav activeCategory="food" />);

    expect(screen.getByRole("tablist")).toBeDefined();
    expect(screen.getByRole("tab", { name: "Food" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Things" })).toBeDefined();

    const activeTab = screen.getByRole("tab", { name: "Food" });
    expect(activeTab.getAttribute("aria-selected")).toBe("true");
  });

  it("calls onCategoryChange and onSearch when a category tab is clicked", () => {
    const onCategoryChange = mock();
    const onSearch = mock();

    render(<CategoryNav activeCategory="food" onCategoryChange={onCategoryChange} onSearch={onSearch} />);

    const thingsTab = screen.getByRole("tab", { name: "Things" });
    fireEvent.click(thingsTab);

    expect(onCategoryChange).toHaveBeenCalledWith("thing");
    expect(onSearch).toHaveBeenCalled();
  });

  it("renders search and filter capsule buttons with Airbnb rounded-full styling", () => {
    const onSearch = mock();
    const onFilter = mock();

    render(<CategoryNav onSearch={onSearch} onFilter={onFilter} />);

    const searchBtn = screen.getByRole("button", { name: "Open search" });
    const filterBtn = screen.getByRole("button", { name: "Open filters" });

    expect(searchBtn.className).toContain("rounded-full");
    expect(filterBtn.className).toContain("rounded-full");

    fireEvent.click(searchBtn);
    expect(onSearch).toHaveBeenCalled();

    fireEvent.click(filterBtn);
    expect(onFilter).toHaveBeenCalled();
  });
});
