import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      distance_filter: "Distance Filter",
      clear_all: "Clear all",
    };
    return translations[key] || key;
  },
}));

import FiltersModal from "@/components/modals/FiltersModal";
import { useUIStore } from "@/store/zustand/useUIStore";

describe("FiltersModal - Airbnb Filter Pill & Dialog", () => {
  it("renders the trigger button with filter label and SlidersHorizontal icon", () => {
    useUIStore.setState({ geoDistance: null });

    render(<FiltersModal />);

    const trigger = screen.getByRole("button", { name: "Distance Filter" });
    expect(trigger).toBeDefined();
    expect(trigger.className).toContain("rounded-xl");
    expect(trigger.textContent).toContain("Filters");
  });

  it("shows active filter badge when geoDistance is set", () => {
    useUIStore.setState({ geoDistance: 25 });

    render(<FiltersModal />);

    const trigger = screen.getByRole("button", { name: "Distance Filter" });
    expect(trigger.textContent).toContain("1");
    expect(trigger.className).toContain("border-foreground/40");
  });

  it("opens dialog on trigger click and shows distance presets", () => {
    useUIStore.setState({ geoDistance: 10 });

    render(<FiltersModal />);

    const trigger = screen.getByRole("button", { name: "Distance Filter" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Distance radius")).toBeDefined();
    expect(screen.getByText("Within 10 km")).toBeDefined();
    expect(screen.getByText("5 km")).toBeDefined();
    expect(screen.getByText("25 km")).toBeDefined();
    expect(screen.getAllByText("Any distance").length).toBeGreaterThanOrEqual(1);
  });

  it("updates selected range when clicking a preset chip and applies on confirm", () => {
    useUIStore.setState({ geoDistance: 10 });

    render(<FiltersModal />);

    const trigger = screen.getByRole("button", { name: "Distance Filter" });
    fireEvent.click(trigger);

    const preset25 = screen.getByRole("button", { name: "25 km" });
    fireEvent.click(preset25);

    expect(screen.getByText("Within 25 km")).toBeDefined();

    const applyButton = screen.getByRole("button", { name: "Show listings" });
    fireEvent.click(applyButton);

    expect(useUIStore.getState().geoDistance).toBe(25);
  });

  it("clears distance filter when Clear all is clicked", () => {
    useUIStore.setState({ geoDistance: 50 });

    render(<FiltersModal />);

    const trigger = screen.getByRole("button", { name: "Distance Filter" });
    fireEvent.click(trigger);

    const clearButton = screen.getByRole("button", { name: "Clear all" });
    fireEvent.click(clearButton);

    expect(useUIStore.getState().geoDistance).toBeNull();
    expect(screen.getAllByText("Any distance").length).toBeGreaterThanOrEqual(1);
  });
});
