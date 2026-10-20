import type { ComponentProps } from "react";
import ProductInterceptPage, { type InterceptKind } from "../../ProductInterceptPage";

/**
 * Intercept `/product/[id]` so a soft navigation opens the detail modal over the
 * listing page instead of a full page load.
 *
 * This route had no intercept at all, which is why no product modal ever
 * opened: `next.config.ts` 308-redirects the 14 category-prefixed detail paths
 * to `/product/:id*`, so `/product/[id]` is the destination of every product
 * link in the app — and it rendered only a standalone page.
 *
 * `kind` is passed explicitly rather than inferred from `searchParams`; see
 * InterceptKind.
 */
export default function Page({ params }: ComponentProps<typeof ProductInterceptPage>) {
  return <ProductInterceptPage params={params} kind={"product" satisfies InterceptKind} />;
}
