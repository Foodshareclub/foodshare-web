/** URL state shared by the search controls, category pages and pagination. */
export interface SearchLocation {
  lat: number;
  lng: number;
}

export function supportsNearbySearch(category: string): boolean {
  return !["challenge", "forum", "foodlytics"].includes(category);
}

export function parseSearchLocation(params: {
  get(name: string): string | null;
}): SearchLocation | null {
  const latitude = params.get("lat");
  const longitude = params.get("lng");
  if (!latitude?.trim() || !longitude?.trim()) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

export function parseSearchRadius(value: string | null | undefined, fallback = 5000): number {
  const parsed = value?.trim() ? Number(value) : fallback;
  return Math.min(50000, Math.max(100, Number.isFinite(parsed) ? parsed : fallback));
}

export function buildListingSearchUrl({
  category,
  term,
  radius,
  location,
}: {
  category: string;
  term: string;
  radius: number | null;
  location?: SearchLocation | null;
}): string {
  const route = category === "all" ? "food" : category === "business" ? "organisation" : category;
  const params = new URLSearchParams();
  if (category === "all") params.set("type", "all");
  if (term.trim()) params.set("key_word", term.trim());
  if (supportsNearbySearch(category)) {
    if (radius !== null && location) {
      params.set("lat", String(location.lat));
      params.set("lng", String(location.lng));
      params.set("radius", String(parseSearchRadius(String(radius))));
      params.set("distance", "nearby");
    } else {
      // An explicit unrestricted search must not be replaced by auto-geolocation.
      params.set("distance", "any");
    }
  }
  const query = params.toString();
  return `/${route}${query ? `?${query}` : ""}`;
}
