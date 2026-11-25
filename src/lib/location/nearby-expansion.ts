/** Hard cap on radius expansion (100 miles). Matches the nearby route clamp. */
export const MAX_NEARBY_RADIUS_METERS = 160000;

/** Next radius step during expansion: doubles, capped at the maximum. */
export function nextRadiusStep(currentRadius: number): number {
  return Math.min(currentRadius * 2, MAX_NEARBY_RADIUS_METERS);
}

export interface ExpandedNearby<T> {
  /** Last page fetched. Empty only when every radius up to the cap was empty. */
  page: T;
  /** Radius the returned page was fetched with. */
  radius: number;
}

/**
 * Fetch the first nearby page, doubling the radius until it contains rows or
 * the cap is reached. A guest whose approximate location sits in a sparse area
 * would otherwise be shown an empty feed while listings exist a few miles
 * further out.
 */
export async function fetchNearbyWithExpansion<T extends { data: readonly unknown[] }>(
  fetchPage: (radius: number) => Promise<T>,
  startRadius: number,
): Promise<ExpandedNearby<T>> {
  let radius = Math.min(Math.max(startRadius, 1), MAX_NEARBY_RADIUS_METERS);
  for (;;) {
    const page = await fetchPage(radius);
    if (page.data.length > 0 || radius >= MAX_NEARBY_RADIUS_METERS) return { page, radius };
    radius = nextRadiusStep(radius);
  }
}
