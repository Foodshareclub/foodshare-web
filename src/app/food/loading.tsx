import { ProductGridSkeleton } from "@/components/skeletons";

/**
 * Products Loading Component
 */
export default function Loading() {
  return <ProductGridSkeleton count={10} />;
}
