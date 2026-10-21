import type { ComponentProps } from "react";
import ProductInterceptPage, { type InterceptKind } from "../../ProductInterceptPage";

/**
 * Intercept `/food/[id]`.
 *
 * Unlike `/thing/:id+`, `/fridge/:id+` and the other category prefixes,
 * `/food/:id+` is **not** in the `next.config.ts` redirect table, so it reaches
 * the filesystem router and this intercept still fires on a soft navigation.
 * `/food/[id]/page.tsx` is the hard-navigation fallback (a 308 stub to the
 * canonical `/product/[id]-slug`).
 */
export default function Page({ params }: ComponentProps<typeof ProductInterceptPage>) {
  return <ProductInterceptPage params={params} kind={"product" satisfies InterceptKind} />;
}
