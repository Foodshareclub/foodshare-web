import { afterEach, describe, expect, mock, test } from "bun:test";
import { EmptyListingState } from "@/components/emptyState/EmptyListingState";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockPush = mock();
let mockIsAuth = false;

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mock() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/zerowaste",
  redirect: mock(),
}));

mock.module("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuth: mockIsAuth,
    user: mockIsAuth ? { id: "test-user-id" } : null,
  }),
}));

mock.module("@/components/modals/AuthenticationUser/AuthenticationUserModal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <span>Auth Modal</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

afterEach(() => {
  cleanup();
  mockPush.mockClear();
  mockIsAuth = false;
});

describe("EmptyListingState", () => {
  test("renders respective zero-waste empty state when productType is zerowaste", () => {
    render(<EmptyListingState productType="zerowaste" />);

    expect(screen.getByText("Zero Waste")).toBeTruthy();
    expect(screen.getByText("No zero waste listings in your area yet")).toBeTruthy();
    expect(screen.getByText("Share in Zero Waste")).toBeTruthy();
  });

  test("renders respective food empty state when productType is food", () => {
    render(<EmptyListingState productType="food" />);

    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getByText("No food listings in your area yet")).toBeTruthy();
    expect(screen.getByText("Share Food")).toBeTruthy();
  });

  test("renders respective things empty state when productType is thing", () => {
    render(<EmptyListingState productType="thing" />);

    expect(screen.getByText("Things")).toBeTruthy();
    expect(screen.getByText("No item listings in your area yet")).toBeTruthy();
    expect(screen.getByText("Share an Item")).toBeTruthy();
  });

  test("renders search query headline and clear button when searchTerm is provided", () => {
    const handleClear = mock();
    render(<EmptyListingState productType="zerowaste" searchTerm="compost bin" onClearSearch={handleClear} />);

    expect(screen.getByText('No listings matching "compost bin"')).toBeTruthy();
    const clearButton = screen.getByText("Clear search");
    expect(clearButton).toBeTruthy();
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  test("navigates to /new?type=zerowaste when authenticated user clicks action", () => {
    mockIsAuth = true;
    render(<EmptyListingState productType="zerowaste" />);

    const actionButton = screen.getByText("Share in Zero Waste");
    fireEvent.click(actionButton);

    expect(mockPush).toHaveBeenCalledWith("/new?type=zerowaste");
  });

  test("opens authentication modal when guest user clicks action", () => {
    mockIsAuth = false;
    render(<EmptyListingState productType="zerowaste" />);

    expect(screen.queryByTestId("auth-modal")).toBeNull();

    const actionButton = screen.getByText("Share in Zero Waste");
    fireEvent.click(actionButton);

    expect(screen.getByTestId("auth-modal")).toBeTruthy();
  });

  test("renders exploration category links", () => {
    render(<EmptyListingState productType="zerowaste" />);

    expect(screen.getByText("Explore other categories nearby")).toBeTruthy();
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getByText("Things")).toBeTruthy();
  });
});
