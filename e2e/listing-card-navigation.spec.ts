import { expect, test, type Page } from "@playwright/test";

// Listing cards on /food are <article aria-label=title>. Skeleton cards are <div>s, so this never matches one.
const LISTING_CARD = "article[aria-label]";
// /food is server-rendered against the live estate (~9 s measured from a developer machine); the test timeout is 60 s.
const FEED_TIMEOUT = 45_000;

test.beforeEach(async ({ context }) => {
  // Guest path: geolocation is denied. The deny only mocks navigator.geolocation —
  // permissions.query and the /api/location/approximate fetch are NOT mocked, so the
  // app still resolves the runner IP and swaps the feed (see firstListing below).
  await context.addInitScript(() => {
    const denied = {
      code: 1,
      message: "User denied Geolocation",
      PERMISSION_DENIED: 1,
    };
    const deny = (_ok: unknown, fail?: (e: unknown) => void) => {
      fail?.(denied);
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: deny,
        watchPosition: () => (deny(null, undefined), 0),
        clearWatch: () => {},
      },
    });
  });
});

async function firstListing(page: Page) {
  await page.goto("/food");
  const card = page.locator(LISTING_CARD).first();
  await expect(card).toBeVisible({ timeout: FEED_TIMEOUT });
  const titleLink = card.locator("h3 a");
  // The feed is server-rendered, then swaps to the IP-approx feed when the app
  // resolves the runner IP (permissions.query is NOT mocked — the geolocation
  // deny only mocks navigator.geolocation). The swap lands after the approximate
  // response (React re-render → setTimeout(0) → nearby fetch → setClientNearbyPosts),
  // so poll the first card's href until it is stable for ~400ms before capturing —
  // the SSR first card's href is stale by the click.
  let previous = "";
  let stableSince = 0;
  await expect(async () => {
    const current = await titleLink.getAttribute("href").catch(() => null);
    if (!current) throw new Error("no href yet");
    if (current !== previous) {
      previous = current;
      stableSince = 0;
      throw new Error("href not stable yet");
    }
    if (!stableSince) stableSince = Date.now();
    if (Date.now() - stableSince < 400) throw new Error("href not stable yet");
  }).toPass({ timeout: FEED_TIMEOUT });
  const href = await titleLink.getAttribute("href").catch(() => null);
  const title = (await titleLink.innerText()).trim();
  expect(href).toMatch(/^\/product\/\d+$/);
  return { card, titleLink, href: href!, title };
}
async function expectDetails(page: Page, href: string, title: string) {
  const id = href.split("/").at(-1)!;
  await expect(page).toHaveURL(new RegExp("/product/" + id + "(?:-|$|[?#])"));
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe("listing card navigation at " + viewport.width + "px", () => {
    test.use({ viewport });

    test("photo opens its listing details without a blocking overlay", async ({ page }) => {
      const { card, href, title } = await firstListing(page);
      const photo = card.locator("a[aria-label]").first();
      await photo.click({ position: { x: 30, y: 60 } });
      await expectDetails(page, href, title);
    });

    test("unused card space opens the same listing", async ({ page }) => {
      const { card, href, title } = await firstListing(page);
      const bounds = await card.boundingBox();
      expect(bounds).not.toBeNull();
      // Inset past the card's 16px rounded corner so the click lands on the card, not the page behind it.
      await card.click({
        position: { x: bounds!.width - 20, y: bounds!.height - 20 },
      });
      await expectDetails(page, href, title);
    });

    test("keyboard opens details and browser back restores the feed", async ({ page }) => {
      const { titleLink, href, title } = await firstListing(page);
      await titleLink.focus();
      await page.keyboard.press("Enter");
      await expectDetails(page, href, title);
      await page.goBack();
      await expect(page).toHaveURL(/\/food(?:[?#]|$)/);
      await expect(page.locator(LISTING_CARD).first()).toBeVisible({
        timeout: FEED_TIMEOUT,
      });
    });

    test("save remains an independent action for guests", async ({ page }) => {
      const { card } = await firstListing(page);
      await card.getByRole("button", { name: "Save listing", exact: true }).click();
      await expect(page).toHaveURL(/\/auth\/login(?:[?#]|$)/);
    });
  });
}
