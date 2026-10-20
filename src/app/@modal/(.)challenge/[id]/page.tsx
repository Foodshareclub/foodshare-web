import type { ComponentProps } from "react";
import ProductInterceptPage, { type InterceptKind } from "../../ProductInterceptPage";

/**
 * Intercept `/challenge/[id]` so a soft navigation opens the detail modal.
 *
 * This used to re-export ProductInterceptPage unchanged, which decided
 * challenge-vs-product from `searchParams.type === "challenge"`. Nothing in the
 * codebase sets that parameter, so a challenge id fell through to
 * `getProductById`, which queries `posts_with_location` — a different table —
 * returned null, and 404'd. The kind is now explicit.
 */
export default function Page({ params }: ComponentProps<typeof ProductInterceptPage>) {
  return <ProductInterceptPage params={params} kind={"challenge" satisfies InterceptKind} />;
}
