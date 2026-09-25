import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NearbyPost } from "@/lib/data/nearby-posts";

const fetchNearbyListings = mock(async (_params: unknown) => ({
  success: true,
  data: [{ id: 2 }],
  hasMore: false,
  nextCursor: null,
  radius: 1000,
}));
mock.module("@/app/actions/nearby-listings", () => ({
  fetchNearbyListings,
  fetchProductsPaginated: mock(),
}));
mock.module("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams("lat=1&lng=2&radius=1000&distance=nearby&key_word=Banana"),
  useRouter: () => ({ refresh: mock() }),
}));
mock.module("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));
mock.module("@/store/zustand/useUIStore", () => ({
  useUIStore: (selector: (state: unknown) => unknown) =>
    selector({ userLocation: null, geoDistance: null, setUserLocation: mock() }),
}));
mock.module("@/components/navigateButtons/NavigateButtons", () => ({ default: () => null }));
mock.module("@/components/productCard/ProductGrid", () => ({
  ProductGrid: ({
    products,
    hasMore,
    onLoadMore,
  }: {
    products: Array<{ id: number }>;
    hasMore: boolean;
    onLoadMore: () => void;
  }) => (
    <div>
      <output aria-label="listing ids">{products.map((product) => product.id).join(",")}</output>
      {hasMore && (
        <button type="button" onClick={onLoadMore}>
          Load more
        </button>
      )}
    </div>
  ),
}));
const { HomeClient } = await import("@/app/HomeClient");

afterEach(() => {
  cleanup();
  fetchNearbyListings.mockClear();
});

function renderNearbySearch() {
  return render(
    <HomeClient
      initialProducts={[]}
      nearbyPosts={[{ id: 1 }] as NearbyPost[]}
      isLocationFiltered
      radiusMeters={1000}
      initialHasMore
      initialNextCursor={{ distance: 100, id: 1 }}
      searchTerm="Banana"
    />
  );
}

describe("nearby listing pagination", () => {
  test("an explicit radius stays fixed and pagination stops when matching results are exhausted", async () => {
    renderNearbySearch();
    fireEvent.click(screen.getByText("Load more"));
    await waitFor(() => expect(screen.getByLabelText("listing ids").textContent).toBe("1,2"));
    expect(screen.queryByText("Load more")).toBeNull();
    expect(fetchNearbyListings).toHaveBeenCalledTimes(1);
    expect(fetchNearbyListings.mock.calls[0][0]).toMatchObject({
      radius: 1000,
      searchTerm: "Banana",
      cursor: { distance: 100, id: 1 },
    });
  });

  test("a failed page preserves listings and allows a manual retry with the same cursor", async () => {
    fetchNearbyListings.mockResolvedValueOnce({
      success: false,
      data: [],
      hasMore: false,
      nextCursor: null,
      radius: 1000,
    });
    renderNearbySearch();
    fireEvent.click(screen.getByText("Load more"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByLabelText("listing ids").textContent).toBe("1");
    expect(screen.queryByText("Load more")).toBeNull();
    fireEvent.click(screen.getByText("try_again"));
    await waitFor(() => expect(screen.getByLabelText("listing ids").textContent).toBe("1,2"));
    expect(fetchNearbyListings).toHaveBeenCalledTimes(2);
    expect(fetchNearbyListings.mock.calls[1][0]).toEqual(fetchNearbyListings.mock.calls[0][0]);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
