import { afterEach, describe, expect, mock, test } from "bun:test";
import { encodeNearbyCursor } from "@/lib/api/listing-cursor";
import type { NearbyPost } from "@/lib/data/nearby-posts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * The feed is a GET now, not a Server Action, and this test is what pins
 * that: the assertion is on the URL the client requests, so a change back to
 * a POST-shaped call would have nothing to assert against and would
 * reintroduce the read-billed-as-a-write bug (every page of infinite scroll
 * spent one of the 30/min mutation-limiter calls in proxy.ts, so the feed
 * 429'd and then the user's next real write did too).
 */
const nearbyUrls: string[] = [];
let nearbyResponder: (url: string) => unknown = () => ({
  success: true,
  data: [{ id: 2 }],
  hasMore: false,
  nextCursor: null,
  radius: 1000,
});

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("/api/listings")) {
    nearbyUrls.push(url);
    const body = nearbyResponder(url);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }
  return originalFetch(input as RequestInfo);
}) as typeof fetch;
mock.module("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("lat=1&lng=2&radius=1000&distance=nearby&key_word=Banana"),
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
  nearbyUrls.length = 0;
  nearbyResponder = () => ({ success: true, data: [{ id: 2 }], hasMore: false, nextCursor: null, radius: 1000 });
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
    />,
  );
}

describe("nearby listing pagination", () => {
  test("an explicit radius stays fixed and pagination stops when matching results are exhausted", async () => {
    renderNearbySearch();
    fireEvent.click(screen.getByText("Load more"));
    await waitFor(() => expect(screen.getByLabelText("listing ids").textContent).toBe("1,2"));
    expect(screen.queryByText("Load more")).toBeNull();
    expect(nearbyUrls).toHaveLength(1);
    // A GET to the read route, carrying the radius, the search term and the
    // keyset cursor the server rendered.
    const url = new URL(nearbyUrls[0], "http://localhost");
    expect(url.pathname).toBe("/api/listings/nearby");
    expect(url.searchParams.get("radius")).toBe("1000");
    expect(url.searchParams.get("q")).toBe("Banana");
    expect(url.searchParams.get("cursor")).toBe(encodeNearbyCursor({ distance: 100, id: 1 }));
  });

  test("a failed page preserves listings and allows a manual retry with the same cursor", async () => {
    // Fail the first page only, so the retry below exercises the success path.
    let served = 0;
    nearbyResponder = () =>
      served++ === 0
        ? { success: false, data: [], hasMore: false, nextCursor: null, radius: 1000 }
        : { success: true, data: [{ id: 2 }], hasMore: false, nextCursor: null, radius: 1000 };
    renderNearbySearch();
    fireEvent.click(screen.getByText("Load more"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByLabelText("listing ids").textContent).toBe("1");
    expect(screen.queryByText("Load more")).toBeNull();
    fireEvent.click(screen.getByText("try_again"));
    await waitFor(() => expect(screen.getByLabelText("listing ids").textContent).toBe("1,2"));
    expect(nearbyUrls).toHaveLength(2);
    // The retry must resume from the same cursor, or the feed would
    // re-serve rows the client already has and its dedupe would hide them.
    expect(nearbyUrls[1]).toBe(nearbyUrls[0]);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
