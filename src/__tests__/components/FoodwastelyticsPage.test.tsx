import FoodwastelyticsPage from "@/app/foodwastelytics/page";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import React from "react";

afterEach(() => {
  cleanup();
});

// Mock Supabase client
mock.module("@/lib/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mock().mockResolvedValue({ data: "Policy advice response", error: null }),
    },
  },
}));

// Mock FloatingOrbs
mock.module("@/components/gpu/FloatingOrbs", () => ({
  FloatingOrbs: () => <div data-testid="floating-orbs" />,
}));

// Mock framer-motion for synchronous renders
mock.module("framer-motion", () => {
  const ReactModule = require("react");
  const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const motion = {
    div: ReactModule.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      ),
    ),
  };
  return {
    AnimatePresence,
    motion,
  };
});

// Mock AdvisorChat
mock.module("@/components/foodlytics/advisor-chat", () => ({
  AdvisorChat: ({ chatMessages }: { chatMessages: Array<{ text: string }> }) => (
    <div data-testid="advisor-chat">
      {chatMessages.map((m, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: test mock
        <p key={i}>{m.text}</p>
      ))}
    </div>
  ),
}));

describe("FoodwastelyticsPage", () => {
  it("does NOT render 'My Household' tab or household logging components, nor 'v2.0 International'", () => {
    render(<FoodwastelyticsPage />);

    // Assert "My Household" and version badges are absent
    expect(screen.queryByText("My Household")).toBeNull();
    expect(screen.queryByText("US Household Benchmark")).toBeNull();
    expect(screen.queryByText("Log Discarded Food")).toBeNull();
    expect(screen.queryByText("Add Waste Entry")).toBeNull();
    expect(screen.queryByText("v2.0 International")).toBeNull();
    expect(screen.queryByText("v2.0")).toBeNull();
  });

  it("renders global food waste intelligence header and planetary macro metrics", () => {
    render(<FoodwastelyticsPage />);

    // Header copy
    expect(screen.getByText("Foodwastelytics")).toBeDefined();
    expect(screen.getAllByText(/Planetary food loss accounting/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/UN SDG 12.3 Target/i).length).toBeGreaterThan(0);

    // Global Macro indicators
    expect(screen.getAllByText("1.32").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1.05").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3.80").length).toBeGreaterThan(0);
    expect(screen.getAllByText("252").length).toBeGreaterThan(0);
  });

  it("renders layout presentation variant switcher and allows switching between variants", () => {
    render(<FoodwastelyticsPage />);

    // Switcher buttons present
    const landingBtn = screen.getByRole("button", { name: /Landing Page \(Editorial\)/i });
    const dashboardBtn = screen.getByRole("button", { name: /Executive Suite \(Tabbed\)/i });
    const storyboardBtn = screen.getByRole("button", { name: /Infographic Story/i });

    expect(landingBtn).toBeDefined();
    expect(dashboardBtn).toBeDefined();
    expect(storyboardBtn).toBeDefined();

    // Default is Landing Page: check landing sections exist
    expect(screen.getByText("The Planetary Food Loss Crisis")).toBeDefined();
    expect(screen.getByText("Farm-to-Fork Supply Chain Loss Flow")).toBeDefined();
    expect(screen.getByText("UNEP Food Waste Index Regional Benchmarks")).toBeDefined();

    // Switch to Executive Suite (Tabbed)
    fireEvent.click(dashboardBtn);
    expect(screen.getByText("Planetary Overview")).toBeDefined();
    expect(screen.getByText("Commodity Matrix")).toBeDefined();

    // Switch to Infographic Story
    fireEvent.click(storyboardBtn);
    expect(screen.getByText("The Journey of Planetary Food Loss to 2030 Recovery")).toBeDefined();
    expect(screen.getByText("Act I: The Global Discard Scale")).toBeDefined();
  });

  it("in Landing Page variant, renders all long-form editorial sections and bullet points", () => {
    render(<FoodwastelyticsPage />);

    // Farm to Fork section
    expect(screen.getByText("Farm-to-Fork Supply Chain Loss Flow")).toBeDefined();
    expect(screen.getAllByText("1. Agricultural Production & Harvest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5. Consumer & Foodservice").length).toBeGreaterThan(0);

    // Regional Benchmarks
    expect(screen.getByText("UNEP Food Waste Index Regional Benchmarks")).toBeDefined();
    expect(screen.getAllByText("North America").length).toBeGreaterThan(0);

    // Commodity Matrix
    expect(screen.getByText("Commodity Vulnerability & Environmental Penalty Matrix")).toBeDefined();
    expect(screen.getByText("The Weight vs Emissions Paradox")).toBeDefined();

    // SDG 12.3 Modeler
    expect(screen.getByText("Interactive Global Target Simulation")).toBeDefined();

    // Policy & Interventions
    expect(screen.getByText("High-Impact Global Policy & Technological Interventions")).toBeDefined();

    // AI Advisor
    expect(screen.getByText("Global Food Waste Policy & Intelligence Advisor")).toBeDefined();
  });

  it("in Executive Suite variant, allows navigating sidebar tabs", () => {
    render(<FoodwastelyticsPage />);

    // Switch to tabbed dashboard
    const dashboardBtn = screen.getByRole("button", { name: /Executive Suite \(Tabbed\)/i });
    fireEvent.click(dashboardBtn);

    // Switch to Farm-to-Fork Flow
    fireEvent.click(screen.getByRole("button", { name: "Farm-to-Fork Flow" }));
    expect(screen.getByText("Farm-to-Fork Supply Chain Loss Flow")).toBeDefined();
    expect(screen.getByText("1. Agricultural Production & Harvest")).toBeDefined();

    // Switch to Regional Benchmarks
    fireEvent.click(screen.getByRole("button", { name: "Regional Benchmarks" }));
    expect(screen.getByText("UNEP Food Waste Index Regional Benchmarks")).toBeDefined();
    expect(screen.getAllByText("North America").length).toBeGreaterThan(0);

    // Switch to Commodity Matrix
    fireEvent.click(screen.getByRole("button", { name: "Commodity Matrix" }));
    expect(screen.getByText("Commodity Vulnerability & Environmental Penalty Matrix")).toBeDefined();
    expect(screen.getByText("Fruits & Vegetables")).toBeDefined();

    // Switch to UN SDG 12.3 Modeler
    fireEvent.click(screen.getByRole("button", { name: "UN SDG 12.3 Modeler" }));
    expect(screen.getByText("UN SDG 12.3 2030 Halving Scenario Modeler")).toBeDefined();
  });

  it("allows switching economic perspectives (All vs High-Income vs Developing & Emerging)", () => {
    render(<FoodwastelyticsPage />);

    const highIncomeBtn = screen.getByRole("button", { name: "High-Income" });
    fireEvent.click(highIncomeBtn);

    // Filtered table should still render High-Income regions
    expect(screen.getAllByText("North America").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Europe & Central Asia").length).toBeGreaterThan(0);

    const developingBtn = screen.getByRole("button", { name: "Developing & Emerging" });
    fireEvent.click(developingBtn);
    expect(screen.getAllByText("Sub-Saharan Africa").length).toBeGreaterThan(0);
  });

  it("updates projected global dividends when user selects different SDG reduction milestones", () => {
    render(<FoodwastelyticsPage />);

    // In default landing mode, SDG modeler is rendered directly
    expect(screen.getByText("Interactive Global Target Simulation")).toBeDefined();

    // Default 50% target should show 660M t
    expect(screen.getAllByText(/660/).length).toBeGreaterThan(0);

    // Click 25% target
    const btn25 = screen.getByRole("button", { name: "25%" });
    fireEvent.click(btn25);

    // 25% target should show 330M t
    expect(screen.getAllByText(/330/).length).toBeGreaterThan(0);
  });
});
