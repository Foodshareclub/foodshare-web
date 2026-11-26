import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// The listing's clock is read through this module; pin it per scenario.
let fixedNow = new Date("2026-06-01T19:00:00Z");
mock.module("@/lib/clock", () => ({ now: () => fixedNow }));

mock.module("next-intl", () => ({
  useTranslations: () => (key: string, values?: { time?: string; count?: number }) => {
    const messages: Record<string, string> = {
      open_now: "Open now",
      closed_status: "Closed",
      opens_at: "Opens at {time}",
      hours_unavailable: "Hours unavailable",
      hours_status: "Hours",
      checking_hours: "Checking hours",
      available: "Available Hours",
      details: "Details",
      transport: "Transport",
      views_count: "{count} views",
    };
    return (messages[key] ?? key).replace("{time}", values?.time ?? "").replace("{count}", String(values?.count ?? ""));
  },
}));

mock.module("next/link", () => ({
  default: ({ href, children }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : (href.pathname ?? "#")}>{children}</a>
  ),
}));

mock.module("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), refresh: mock() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/food",
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: "u" }, isAdmin: false }),
}));

mock.module("@/app/actions/chat", () => ({ updateRoom: mock() }));
mock.module("@/app/actions/products", () => ({ updateProduct: mock() }));

mock.module("@/components/modals/AuthenticationUser/AuthenticationUserModal", () => ({
  default: () => <div data-testid="auth-modal" />,
}));
mock.module("@/components/modals/PopupNotificationModal", () => ({
  default: () => null,
}));
mock.module("@/components/topTips/TopTips", () => ({ default: () => null }));
mock.module("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));
mock.module("@/components/productCard/ImageCarousel", () => ({
  ImageCarousel: () => <div data-testid="carousel" />,
}));
mock.module("@/components/productCard/ProductCardActions", () => ({
  ProductCardActions: () => null,
}));
mock.module("@/components/productCard/ProductCardWrapper", () => ({
  ProductCardWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { OneProduct } from "@/components/oneProduct/OneProduct";
import { ProductCard } from "@/components/productCard/ProductCard";
import { evaluateOpenState, formatClock, type WeeklyHours } from "@/lib/opening-hours";
import type { InitialProductStateType } from "@/types/product.types";

afterEach(cleanup);

const week = (overrides: Partial<WeeklyHours> = {}): WeeklyHours => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
  ...overrides,
});

const baseProduct: InitialProductStateType = {
  id: 42,
  post_name: "Test Fridge",
  post_description: "",
  post_type: "fridge",
  available_hours: "Mon-Fri 9am-5pm",
  condition: "fresh",
  created_at: "2026-06-01T00:00:00Z",
  five_star: null,
  four_star: null,
  images: [],
  location: "0101000020E610000000000000000000000000000000000000",
  post_address: "1 Main St",
  post_stripped_address: "1 Main St",
  is_arranged: false,
  post_like_counter: 0,
  transportation: "",
  is_active: true,
  post_views: 0,
  profile_id: "profile-1",
  partner_status: "Active",
  opening_hours: week({ mon: [{ start: "09:00", end: "17:00" }] }),
  timezone: "America/Los_Angeles",
};

type Scenario = {
  name: string;
  now: string;
  hours: WeeklyHours | null | undefined;
  timezone: string | null;
  availableHours: string;
  expected: "Open now" | "Closed" | "Opens at 9 AM" | "Hours unavailable";
};

const scenarios: Scenario[] = [
  {
    name: "daytime span",
    now: "2026-06-01T19:00:00Z",
    hours: week({ mon: [{ start: "09:00", end: "17:00" }] }),
    timezone: "America/Los_Angeles",
    availableHours: "Mon-Fri 9am-5pm",
    expected: "Open now",
  },
  {
    name: "closed day",
    now: "2026-06-01T19:00:00Z",
    hours: week(),
    timezone: "America/Los_Angeles",
    availableHours: "Closed",
    expected: "Closed",
  },
  {
    name: "opens later today",
    now: "2026-06-01T14:00:00Z",
    hours: week({ mon: [{ start: "09:00", end: "17:00" }] }),
    timezone: "America/Los_Angeles",
    availableHours: "Mon-Fri 9am-5pm",
    expected: "Opens at 9 AM",
  },
  {
    name: "overnight span after midnight",
    now: "2026-06-07T08:30:00Z",
    hours: week({ sat: [{ start: "18:00", end: "02:00" }] }),
    timezone: "America/Los_Angeles",
    availableHours: "Sat 18:00-02:00",
    expected: "Open now",
  },
  {
    name: "foreign timezone",
    now: "2026-06-01T00:30:00Z",
    hours: week({ mon: [{ start: "09:00", end: "17:00" }] }),
    timezone: "Asia/Tokyo",
    availableHours: "Mon-Fri 9am-5pm",
    expected: "Open now",
  },
  {
    name: "DST before spring forward",
    now: "2026-03-08T09:30:00Z",
    hours: week({ sun: [{ start: "01:00", end: "02:30" }] }),
    timezone: "America/Los_Angeles",
    availableHours: "Sun 01:00-02:30",
    expected: "Open now",
  },
  {
    name: "DST after spring forward",
    now: "2026-03-08T10:30:00Z",
    hours: week({ sun: [{ start: "01:00", end: "02:30" }] }),
    timezone: "America/Los_Angeles",
    availableHours: "Sun 01:00-02:30",
    expected: "Closed",
  },
  {
    name: "unparsable value stored as unknown",
    now: "2026-06-01T19:00:00Z",
    hours: null,
    timezone: "America/Los_Angeles",
    availableHours: "By appointment",
    expected: "Hours unavailable",
  },
  {
    name: "missing hours value",
    now: "2026-06-01T19:00:00Z",
    hours: undefined,
    timezone: "America/Los_Angeles",
    availableHours: "",
    expected: "Hours unavailable",
  },
  {
    name: "unknown hours despite open-looking raw text",
    now: "2026-06-01T19:00:00Z",
    hours: null,
    timezone: "America/Los_Angeles",
    availableHours: "Open 24/7",
    expected: "Hours unavailable",
  },
  {
    name: "malformed stored schedule",
    now: "2026-06-01T19:00:00Z",
    hours: { mon: [{ start: "9:00", end: "17:00" }] } as unknown as WeeklyHours,
    timezone: "America/Los_Angeles",
    availableHours: "Mon-Fri 9am-5pm",
    expected: "Hours unavailable",
  },
];

function listing(scenario: Scenario): InitialProductStateType {
  return {
    ...baseProduct,
    available_hours: scenario.availableHours,
    opening_hours: scenario.hours,
    timezone: scenario.timezone,
  };
}

function expectedLabel(scenario: Scenario): string {
  const state = evaluateOpenState(scenario.hours, scenario.timezone, new Date(scenario.now));
  if (state.kind === "open") return "Open now";
  if (state.kind === "closed") return "Closed";
  if (state.kind === "opens_at") return `Opens at ${formatClock(state.at)}`;
  return "Hours unavailable";
}

async function expectChip(label: string) {
  const chip = await screen.findByTestId("listing-open-status");
  await waitFor(() => expect(chip.textContent).toBe(label));
  return chip;
}

describe("listing availability rendering", () => {
  for (const scenario of scenarios) {
    test(`card renders ${scenario.expected} for ${scenario.name}`, async () => {
      fixedNow = new Date(scenario.now);
      expect(expectedLabel(scenario)).toBe(scenario.expected);
      render(<ProductCard product={listing(scenario)} />);
      await expectChip(scenario.expected);
      if (scenario.expected === "Hours unavailable") {
        expect(screen.queryByText("Open now")).toBeNull();
        expect(screen.queryByText("Closed")).toBeNull();
      }
    });

    test(`detail renders ${scenario.expected} for ${scenario.name}`, async () => {
      fixedNow = new Date(scenario.now);
      expect(expectedLabel(scenario)).toBe(scenario.expected);
      render(<OneProduct product={listing(scenario)} buttonValue="completed" />);
      await expectChip(scenario.expected);
      if (scenario.expected === "Hours unavailable") {
        expect(screen.queryByText("Open now")).toBeNull();
        expect(screen.queryByText("Closed")).toBeNull();
      }
    });
  }
});
