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
    expect(screen.getByText(/Planetary food loss accounting/i)).toBeDefined();
    expect(screen.getByText(/UN SDG 12.3 Target/i)).toBeDefined();

    // Global Macro indicators
    expect(screen.getByText("1.32")).toBeDefined();
    expect(screen.getByText("$1.05")).toBeDefined();
    expect(screen.getByText("3.80")).toBeDefined();
    expect(screen.getByText("252")).toBeDefined();
  });

  it("renders the 7 international tabs and allows switching views", () => {
    render(<FoodwastelyticsPage />);

    // Navigation sections
    const tabs = [
      "Planetary Overview",
      "Farm-to-Fork Flow",
      "Regional Benchmarks",
      "Commodity Matrix",
      "UN SDG 12.3 Modeler",
      "Global Policy & Tech",
      "Global AI Advisor",
    ];

    for (const tabName of tabs) {
      expect(screen.getByText(tabName)).toBeDefined();
    }

    // Switch to Farm-to-Fork Flow
    fireEvent.click(screen.getByText("Farm-to-Fork Flow"));
    expect(screen.getByText("Global Farm-to-Fork Loss Architecture")).toBeDefined();
    expect(screen.getByText("Stage Deep-Dive Telemetry")).toBeDefined();

    // Switch to Regional Benchmarks
    fireEvent.click(screen.getByText("Regional Benchmarks"));
    expect(screen.getByText("UNEP Food Waste Index Regional Benchmarks")).toBeDefined();
    expect(screen.getAllByText("North America").length).toBeGreaterThan(0);

    // Switch to Commodity Matrix
    fireEvent.click(screen.getByText("Commodity Matrix"));
    expect(screen.getByText("Commodity Vulnerability & Environmental Penalty Matrix")).toBeDefined();
    expect(screen.getByText("The Weight vs Emissions Paradox")).toBeDefined();

    // Switch to UN SDG 12.3 Modeler
    fireEvent.click(screen.getByText("UN SDG 12.3 Modeler"));
    expect(screen.getByText("UN SDG 12.3 2030 Halving Scenario Modeler")).toBeDefined();
    expect(screen.getByText("Select Global Reduction Milestone")).toBeDefined();
  });

  it("allows switching economic perspectives (All vs High-Income vs Developing)", () => {
    render(<FoodwastelyticsPage />);

    const highIncomeBtn = screen.getByText("High-Income");
    fireEvent.click(highIncomeBtn);

    // Switch to Regional Benchmarks to observe filtered regions
    fireEvent.click(screen.getByText("Regional Benchmarks"));
    expect(screen.getAllByText("North America").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Europe & Central Asia").length).toBeGreaterThan(0);
  });

  it("updates projected global dividends when user selects different SDG reduction milestones", () => {
    render(<FoodwastelyticsPage />);

    // Go to SDG modeler
    fireEvent.click(screen.getByText("UN SDG 12.3 Modeler"));

    // 50% is default (660M tonnes)
    expect(screen.getByText("660M t")).toBeDefined();

    // Click 25% target
    const btn25 = screen.getByText("25%");
    fireEvent.click(btn25);

    // 25% of 1320M = 330M tonnes
    expect(screen.getByText("330M t")).toBeDefined();
  });
});
